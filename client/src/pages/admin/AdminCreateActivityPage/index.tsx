import { useState, useEffect, useRef, FormEvent, Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { LANGS, useTranslations, useLang } from '../../../context/LanguageContext';
import { texts, HELP_CATEGORIES } from './AdminCreateActivityPage.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import FileUploadButton from '../../../components/FileUploadButton';
import {
  AdminPage,
  AdminHeader,
  AdminContent,
  Form,
  Input,
  PrimaryButton,
  ErrorText,
  SelectionGroup,
  SelectionButton,
  OutlineButton,
} from '../../../components/styled';
import {
  AdminCardForm,
  PageTitle,
  SectionLabel,
  SectionLabelSmall,
  SectionDescription,
  SelectionSubtext,
  InlineRow,
  InlineRowGap12,
  FlexInput,
  CounterButton,
  CounterDisplay,
  VerticalStack,
} from '../styled';
import { isWizardModule } from './types';
import { DEFAULT_PROXIMITY_METERS } from '../../../utils/geo';
import type {
  LoginField,
  ConnectionType,
  GroupEntryMode,
  ModuleType,
  OpeningType,
  PopupContentType,
  PopupMessage,
  ModuleItem,
  Activity,
  CustomInstructions,
  ItemLocation,
} from './types';
import ModuleItemsSection from './ModuleItemsSection';
import GroupOrderEditor from './GroupOrderEditor';
import PopupMessagesSection from './PopupMessagesSection';
import ThemeFormModal, { type CustomTheme } from './ThemeFormModal';
import ThemePickerModal, {
  ThemeSwatchTiny,
  builtInThemeOptions,
  customThemeOption,
} from './ThemePickerModal';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import EditOnly from '../../../components/EditOnly';
import CollageSplitEditor, { type SplitEditorResult } from './CollageSplitEditor';

// ─── Clean section card with icon ───

const SectionCard = styled('section')({
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  padding: '20px 24px',
  borderRadius: 16,
  border: '1px solid #ececf4',
  background: '#fff',
  transition: 'box-shadow 0.2s',
  minWidth: 0,
  '&:hover': {
    boxShadow: '0 2px 12px rgba(108,92,231,0.06)',
  },
  '@media (max-width: 600px)': {
    padding: '16px 14px',
  },
});

const SectionCardWide = styled(SectionCard)({
  marginTop: 16,
});

const SectionHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  paddingBottom: 10,
  borderBottom: '1px solid #f0f0f4',
  marginBottom: 2,
});


const SectionHeaderTitle = styled('h3')({
  margin: 0,
  fontSize: 15,
  fontWeight: 700,
  color: '#333',
});

const CollapsibleSectionHeader = styled('button')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  gap: 10,
  padding: 0,
  paddingBottom: 10,
  marginBottom: 2,
  border: 'none',
  borderBottom: '1px solid #f0f0f4',
  background: 'transparent',
  cursor: 'pointer',
  textAlign: 'start',
  font: 'inherit',
  color: 'inherit',
});

/** Disclosure caret drawn from borders rather than a glyph — points down when
 *  collapsed, up when open. */
const CollapseChevron = styled('span')<{ expanded?: boolean }>(({ expanded }) => ({
  display: 'inline-block',
  width: 0,
  height: 0,
  flexShrink: 0,
  marginTop: expanded ? 0 : 4,
  borderInlineStart: '5px solid transparent',
  borderInlineEnd: '5px solid transparent',
  ...(expanded
    ? { borderBottom: '6px solid #888', borderTop: 'none' }
    : { borderTop: '6px solid #888', borderBottom: 'none' }),
  transition: 'margin 0.15s',
}));

const FormGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 20,
  alignItems: 'start',
  '@media (max-width: 900px)': {
    gridTemplateColumns: '1fr',
  },
});

const InlineRowMt8 = styled(InlineRow)({
  marginTop: 8,
});

const CounterRow = styled(InlineRowGap12)({
  marginBottom: 12,
});

const TextArea = styled('textarea')({
  width: '100%',
  padding: '12px 16px',
  borderRadius: 10,
  border: '1.5px solid #e0e0e0',
  background: '#fafafa',
  fontSize: 14,
  fontFamily: 'inherit',
  resize: 'vertical',
  minHeight: 60,
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
  '&:focus': {
    outline: 'none',
    borderColor: '#6c5ce7',
    background: '#fff',
  },
});

// ─── Progress rail — plain numbered circles + labels, no icons ───

const ProgressRail = styled('div')({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  gap: 0,
  marginBottom: 8,
  flexWrap: 'wrap',
});

type StepId = 1 | 2 | 3 | 4 | 5 | 6;

const ProgressStepBtn = styled('button')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  background: 'none',
  border: 'none',
  padding: '0 6px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:disabled': {
    cursor: 'not-allowed',
  },
});

const ProgressCircle = styled('span')<{ state: 'done' | 'current' | 'upcoming' }>(({ state }) => ({
  position: 'relative',
  width: 28,
  height: 28,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  fontWeight: 700,
  boxSizing: 'border-box',
  background: state === 'done' ? '#6c5ce7' : '#fff',
  border: state === 'upcoming' ? '1.5px solid #ddd' : '2px solid #6c5ce7',
  color: state === 'done' ? '#fff' : state === 'current' ? '#6c5ce7' : '#aaa',
}));

const ProgressLabel = styled('span')<{ state: 'done' | 'current' | 'upcoming' }>(({ state }) => ({
  fontSize: 12,
  fontWeight: state === 'current' ? 700 : 500,
  color: state === 'upcoming' ? '#bbb' : state === 'current' ? '#6c5ce7' : '#666',
  whiteSpace: 'nowrap',
  '@media (max-width: 640px)': {
    display: state === 'current' ? 'block' : 'none',
  },
}));

/** Marks a step the admin has already been through that still has something
 *  outstanding — colour only, no glyph. */
const IssueDot = styled('span')({
  position: 'absolute',
  top: -1,
  insetInlineEnd: -1,
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: '#e74c3c',
  border: '2px solid #fff',
  boxSizing: 'border-box',
});

const ProgressConnector = styled('div')<{ done?: boolean }>(({ done }) => ({
  flex: '1 1 24px',
  minWidth: 16,
  maxWidth: 56,
  height: 2,
  marginTop: 13,
  background: done ? '#6c5ce7' : '#e3e3ea',
}));

const StepIntro = styled('div')({
  textAlign: 'center',
  marginBottom: 24,
});

const StepIntroTitle = styled('h3')({
  margin: 0,
  fontSize: 17,
  fontWeight: 700,
  color: '#333',
});

const StepIntroSubtitle = styled('p')({
  margin: '4px 0 0',
  fontSize: 13,
  color: '#888',
});

const StepNav = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  marginTop: 8,
  flexWrap: 'wrap',
});

// ─── Module type — large text-only selectable cards ───

const ModuleTypeGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 10,
  '@media (max-width: 700px)': {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
});

const ModuleTypeCard = styled('button')<{ selected?: boolean }>(({ selected }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: 4,
  padding: '18px 12px',
  minHeight: 96,
  borderRadius: 14,
  border: `2px solid ${selected ? '#6c5ce7' : '#e0e0e0'}`,
  background: selected ? '#f5f0ff' : '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s',
  '&:hover': {
    borderColor: '#6c5ce7',
  },
}));

const ModuleTypeCardTitle = styled('div')({
  fontSize: 15,
  fontWeight: 700,
  color: '#333',
});

const ModuleTypeCardDesc = styled('div')({
  fontSize: 12,
  color: '#888',
  lineHeight: 1.4,
});

// ─── Review card (final step) ───

const ReviewRow = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  padding: '10px 0',
  borderBottom: '1px solid #f0f0f4',
  fontSize: 14,
});

const ReviewLabel = styled('span')({
  color: '#888',
});

const ReviewValue = styled('span')({
  fontWeight: 600,
  color: '#333',
  textAlign: 'end',
});

// ─── Validation callouts — color + text, no warning icon ───

const IssueBanner = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '10px 14px',
  marginTop: 8,
  borderRadius: 8,
  borderInlineStart: '3px solid #e74c3c',
  background: '#fdeeea',
  fontSize: 13,
  color: '#c0392b',
});

const IssueBannerLink = styled('button')({
  background: 'none',
  border: 'none',
  color: '#6c5ce7',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  textDecoration: 'underline',
  flexShrink: 0,
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
});

const NameInput = styled(Input)({
  fontSize: 18,
  fontWeight: 600,
  padding: '16px 20px',
  borderRadius: 14,
  border: '2px solid #e8e8ec',
  '&:focus': {
    borderColor: '#6c5ce7',
  },
});


const SmsTemplateArea = styled('textarea')({
  width: '100%',
  minHeight: 120,
  padding: '14px 16px',
  fontSize: 14,
  fontFamily: 'inherit',
  border: '1px solid #e0dce8',
  borderRadius: 10,
  resize: 'vertical',
  boxSizing: 'border-box',
  lineHeight: 1.5,
  '&:focus': {
    outline: 'none',
    borderColor: '#6c5ce7',
  },
});

const SmsVarChip = styled('button')({
  fontSize: 12,
  fontWeight: 600,
  padding: '4px 10px',
  borderRadius: 16,
  border: '1px solid #d8d2e0',
  background: '#f8f6fc',
  color: '#6c5ce7',
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { background: '#f0eefa' },
});


/** Collapsed theme control: current theme as a miniature + its name + Change.
 *  The full gallery lives in ThemePickerModal so the form stays short. */
const ThemeRow = styled('button')({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  border: '1.5px solid #e8e8ec',
  background: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textAlign: 'start',
  transition: 'border-color 0.15s',
  '&:hover': { borderColor: '#6c5ce7' },
});

const ThemeRowSwatch = styled('span')({
  width: 56,
  flexShrink: 0,
  display: 'block',
});

const ThemeRowName = styled('span')({
  flex: 1,
  minWidth: 0,
  fontSize: 14,
  fontWeight: 600,
  color: '#333',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const ThemeRowAction = styled('span')({
  flexShrink: 0,
  fontSize: 12,
  fontWeight: 700,
  color: '#6c5ce7',
});

/** Sub-block inside a card. Only a block that follows another one draws the
 *  hairline, so it never doubles up with the card header's own rule. */
const SubBlock = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  '& + &': {
    paddingTop: 16,
    marginTop: 4,
    borderTop: '1px solid #f0f0f4',
  },
});

export default function AdminCreateActivityPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const t = useTranslations(texts);
  const { lang } = useLang();

  const defaultGroupName = (i: number) => `${t.groupDefault} ${i}`;

  const [name, setName] = useState('');
  const [includeOnRoadmap, setIncludeOnRoadmap] = useState(false);
  const [loginFields, setLoginFields] = useState<Set<LoginField>>(new Set(['name']));
  const [emailGoogle, setEmailGoogle] = useState(false);
  const [connectionType, setConnectionType] = useState<ConnectionType>('single');
  const [groupEntryMode, setGroupEntryMode] = useState<GroupEntryMode>('preset');
  const [groupMinMembers, setGroupMinMembers] = useState(1);
  const [groupMaxMembers, setGroupMaxMembers] = useState(0);
  const [groupRewardEnabled, setGroupRewardEnabled] = useState(false);
  const [groupRewardCoupon, setGroupRewardCoupon] = useState('');
  const [groupRewardMessage, setGroupRewardMessage] = useState('');
  const [groupRewardAttachmentUrl, setGroupRewardAttachmentUrl] = useState('');
  const [groupRewardAttachmentType, setGroupRewardAttachmentType] = useState<'image' | 'pdf'>('image');
  const [smsForCollage, setSmsForCollage] = useState(false);
  const [smsForCollageMessage, setSmsForCollageMessage] = useState('');
  const [smsForCollageShare, setSmsForCollageShare] = useState(false);
  const [smsTestPhone, setSmsTestPhone] = useState('');
  const [smsTestSending, setSmsTestSending] = useState(false);
  const [smsTestFeedback, setSmsTestFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [groupCount, setGroupCount] = useState(2);
  const [groupNames, setGroupNames] = useState<string[]>(() => [defaultGroupName(1), defaultGroupName(2)]);

  const [moduleType, setModuleType] = useState<ModuleType>('story');
  const [moduleTheme, setModuleTheme] = useState<string>('');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [selectedItems, setSelectedItems] = useState<ModuleItem[]>([]);
  // Map modules: per-group visiting order, group name -> permutation of item indices.
  const [groupOrders, setGroupOrders] = useState<Record<string, number[]>>({});
  const [proximityMeters, setProximityMeters] = useState(DEFAULT_PROXIMITY_METERS);

  const [openingType, setOpeningType] = useState<OpeningType>('none');
  const [openingUrl, setOpeningUrl] = useState('');

  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [userControl, setUserControl] = useState(false);

  const [guidelines, setGuidelines] = useState('');
  /** Languages the activity is offered in besides Hebrew. */
  const [languages, setLanguages] = useState<string[]>([]);
  const [extraSupportInfo, setExtraSupportInfo] = useState('');
  const [organizerContactName, setOrganizerContactName] = useState('');
  const [organizerContactPhone, setOrganizerContactPhone] = useState('');
  const [helpCategoriesDisabled, setHelpCategoriesDisabled] = useState<string[]>([]);
  const [helpCategoryResponses, setHelpCategoryResponses] = useState<Record<string, string>>({});
  const [helpOtherCategoryEnabled, setHelpOtherCategoryEnabled] = useState(false);
  // UI-only — never sent to the server, never persisted on the activity.
  const [helpChatSectionExpanded, setHelpChatSectionExpanded] = useState(false);

  const [alwaysOpen, setAlwaysOpen] = useState(true);
  const [dailyReset, setDailyReset] = useState(false);
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');

  const [popups, setPopups] = useState<PopupMessage[]>([]);

  const [useDefaultInstructions, setUseDefaultInstructions] = useState(true);
  const [customInstructions, setCustomInstructions] = useState<CustomInstructions>({
    title: '',
    missionTitle: '',
    missionItems: [''],
    guidelinesTitle: '',
    guidelineItems: [''],
    buttonText: '',
  });

  const [showStationNumbers, setShowStationNumbers] = useState(false);
  const [showItemTitleNumbers, setShowItemTitleNumbers] = useState(false);

  const [leaderboardMode, setLeaderboardMode] = useState<'points' | 'time' | 'both'>('points');
  const [leaderboardAsGrade, setLeaderboardAsGrade] = useState(false);
  const [displayLeaderboardInHeader, setDisplayLeaderboardInHeader] = useState(false);
  const [leaderboardCurrentDayOnly, setLeaderboardCurrentDayOnly] = useState(true);
  const [activityDurationMinutes, setActivityDurationMinutes] = useState('');
  const [roadmapTimerEnabled, setRoadmapTimerEnabled] = useState(false);
  const [roadmapTimerMinutes, setRoadmapTimerMinutes] = useState('');
  const [isContinuous, setIsContinuous] = useState(false);
  const [portalId, setPortalId] = useState('');
  const [portals, setPortals] = useState<{ _id: string; name: string; code: string }[]>([]);

  // Custom themes
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null);
  const { admin: currentAdmin } = useAdminAuth();
  const canEditContent = currentAdmin?.role !== 'viewer';
  const canManageTheme = (theme: CustomTheme) =>
    canEditContent &&
    (currentAdmin?.role !== 'customer' || theme.createdByEmail === currentAdmin.email.toLowerCase());
  const canSendTestSms = currentAdmin?.role === 'admin' || currentAdmin?.role === 'super_admin';

  const [step, setStep] = useState<StepId>(1);

  // Steps the admin has actually been through. An outstanding issue is only
  // flagged on the rail for one of these, so a fresh form never opens already
  // scolding you about steps you haven't reached. An activity being edited is
  // fully "visited" — its problems are worth surfacing straight away.
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(
    () => new Set(isEditMode ? [1, 2, 3, 4, 5, 6] : [1]),
  );
  useEffect(() => {
    setVisitedSteps((prev) => (prev.has(step) ? prev : new Set(prev).add(step)));
  }, [step]);

  // Split-editor popup state: index into selectedItems of the collage being edited.
  const [splitEditorIndex, setSplitEditorIndex] = useState<number | null>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const smsTemplateRef = useRef<HTMLTextAreaElement>(null);

  // Fetch custom themes on mount
  useEffect(() => {
    adminApiFetch<{ themes: CustomTheme[] }>('/api/admin/themes')
      .then((data) => setCustomThemes(data.themes))
      .catch(() => {});
  }, []);

  const handleDeleteTheme = async (id: string) => {
    if (!window.confirm(t.confirmDeleteTheme)) return;
    try {
      await adminApiFetch(`/api/admin/themes/${id}`, { method: 'DELETE' });
      setCustomThemes((prev) => prev.filter((t) => t._id !== id));
      if (moduleTheme === id) setModuleTheme('');
    } catch {
      // silent
    }
  };

  // Fetch portals list for continuous activity dropdown
  useEffect(() => {
    if (!isContinuous && portals.length === 0) return;
    if (portals.length > 0) return;
    adminApiFetch<{ portals: { _id: string; name: string; code: string }[] }>('/api/admin/portals')
      .then((data) => setPortals(data.portals))
      .catch(() => {});
  }, [isContinuous]);

  useEffect(() => {
    if (!id) return;
    adminApiFetch<{ activity: Activity }>(`/api/admin/activities/${id}`)
      .then((data) => {
        const a = data.activity;
        setName(a.name);
        setLoginFields(new Set(a.loginFields as LoginField[]));
        setEmailGoogle(a.emailGoogle || false);
        setConnectionType(a.connectionType as ConnectionType);
        if (a.connectionType === 'group') {
          setGroupEntryMode(a.groupEntryMode === 'selfService' ? 'selfService' : 'preset');
          setGroupMinMembers(a.groupMinMembers ?? 1);
          setGroupMaxMembers(a.groupMaxMembers ?? 0);
          if (a.groupReward) {
            setGroupRewardEnabled(a.groupReward.enabled);
            setGroupRewardCoupon(a.groupReward.couponCode || '');
            setGroupRewardMessage(a.groupReward.messageTemplate || '');
            if (a.groupReward.attachmentUrl) {
              setGroupRewardAttachmentUrl(a.groupReward.attachmentUrl);
              setGroupRewardAttachmentType(a.groupReward.attachmentType === 'pdf' ? 'pdf' : 'image');
            }
          }
          if (a.groups.length > 0) {
            setGroupCount(a.groups.length);
            setGroupNames(a.groups.map((g) => g.name));
          }
        }
        setSmsForCollage(a.smsForCollage === true);
        setSmsForCollageMessage(a.smsForCollageMessage || '');
        setSmsForCollageShare(a.smsForCollageShare === true);
        if (a.opening) {
          setOpeningType(a.opening.type as OpeningType);
          setOpeningUrl(a.opening.url || '');
        }
        if (a.module) {
          // Legacy mission-type activities are treated as story for editing
          const mType = a.module.type === 'mission' ? 'story' : a.module.type;
          setModuleType(mType as ModuleType);
          setModuleTheme(a.module.theme || '');
          setBackgroundImage(a.module.backgroundImage || '');
          if (a.module.showStationNumbers) setShowStationNumbers(true);
          if (a.module.showItemTitleNumbers) setShowItemTitleNumbers(true);
          if (a.module.items && a.module.items.length > 0) {
            setSelectedItems(
              a.module.items.map((item) => ({
                itemType: item.type,
                ref: item.data?._id || item.ref,
                name: item.data?.name || '?',
                subType: item.data?.type,
                description: item.data?.description,
                customer: item.data?.customer,
                theme: item.data?.theme,
                settings: item.data?.settings,
                groups: item.groups,
                spiderSvg: (item as { spiderSvg?: string }).spiderSvg,
                isFinal: (item as { isFinal?: boolean }).isFinal || undefined,
                revisitable: (item as { revisitable?: boolean }).revisitable || undefined,
                collageSplit: (item as { collageSplit?: { splitGroupId: string; partIndex: number; partSizes?: number[]; totalParts?: number } }).collageSplit as ModuleItem['collageSplit'],
                location: item.location,
              }))
            );
          }
          if (a.module.groupOrders) setGroupOrders(a.module.groupOrders);
          if (a.module.proximityMeters) setProximityMeters(a.module.proximityMeters);
        }
        if (a.managerEmail) setManagerEmail(a.managerEmail);
        setUserControl(a.userControl === true);
        if (a.guidelines) setGuidelines(a.guidelines);
        if (a.languages) setLanguages(a.languages);
        if (a.organizerContactName) setOrganizerContactName(a.organizerContactName);
        if (a.organizerContactPhone) setOrganizerContactPhone(a.organizerContactPhone);
        if (a.extraSupportInfo) setExtraSupportInfo(a.extraSupportInfo);
        if (a.helpCategoriesDisabled?.length) setHelpCategoriesDisabled(a.helpCategoriesDisabled);
        if (a.helpCategoryResponses) setHelpCategoryResponses(a.helpCategoryResponses);
        if (a.helpOtherCategoryEnabled) setHelpOtherCategoryEnabled(true);
        if (a.customInstructions) {
          setUseDefaultInstructions(false);
          setCustomInstructions({
            title: a.customInstructions.title || '',
            missionTitle: a.customInstructions.missionTitle || '',
            missionItems: a.customInstructions.missionItems?.length ? a.customInstructions.missionItems : [''],
            guidelinesTitle: a.customInstructions.guidelinesTitle || '',
            guidelineItems: a.customInstructions.guidelineItems?.length ? a.customInstructions.guidelineItems : [''],
            buttonText: a.customInstructions.buttonText || '',
          });
        }
        if (a.scheduledStart || a.scheduledEnd) {
          setAlwaysOpen(false);
          if (a.scheduledStart) setScheduledStart(a.scheduledStart.slice(0, 16));
          if (a.scheduledEnd) setScheduledEnd(a.scheduledEnd.slice(0, 16));
        }
        if (a.module?.popups && a.module.popups.length > 0) {
          setPopups(a.module.popups.map((p) => ({
            title: p.title,
            contentType: (p.contentType === 'image' ? 'image' : 'text') as PopupContentType,
            text: p.text || '',
            image: p.image || '',
            includeUsername: p.includeUsername === true,
            triggerPoint: p.trigger.point as PopupMessage['triggerPoint'],
            itemIndex: p.trigger.itemIndex ?? 0,
            conditionType: p.condition?.type === 'participantCount' ? 'participantCount' : 'none',
            threshold: p.condition?.threshold ?? 20,
            enabled: p.enabled,
          })));
        }
        if (a.isContinuous) {
          setIsContinuous(true);
          if (a.portalId) setPortalId(a.portalId);
        }
        if (a.leaderboardMode) setLeaderboardMode(a.leaderboardMode);
        setLeaderboardAsGrade(a.leaderboardAsGrade === true);
        setDisplayLeaderboardInHeader(!a.hideLeaderboardInHeader);
        setLeaderboardCurrentDayOnly(a.leaderboardCurrentDayOnly !== false);
        setDailyReset(a.dailyReset === true);
        if (a.activityDurationMinutes) setActivityDurationMinutes(String(a.activityDurationMinutes));
        if (a.roadmapTimerMinutes) {
          setRoadmapTimerEnabled(true);
          setRoadmapTimerMinutes(String(a.roadmapTimerMinutes));
        }
        if (a.includeOnRoadmap) setIncludeOnRoadmap(true);
        setInitialLoading(false);
      })
      .catch(() => navigate('/admin/dashboard'));
  }, [id, navigate]);

  // Re-fetch each item's underlying game/station data when the window regains
  // focus. This way, edits made to a game/station in another tab/page show up
  // here without requiring a manual reload — preserving any unsaved order /
  // groups / spider config in `selectedItems`.
  useEffect(() => {
    if (!id) return;
    const refreshItems = () => {
      setSelectedItems((prev) => {
        if (prev.length === 0) return prev;
        const gameRefs = Array.from(new Set(prev.filter((i) => i.itemType === 'game').map((i) => i.ref)));
        const stationRefs = Array.from(new Set(prev.filter((i) => i.itemType === 'station').map((i) => i.ref)));
        Promise.all([
          ...gameRefs.map((r) => adminApiFetch<{ game: { _id: string; name: string; type?: string; description?: string; customer?: string; theme?: string; settings?: Record<string, unknown> } }>(`/api/admin/games/${r}`).catch(() => null)),
          ...stationRefs.map((r) => adminApiFetch<{ station: { _id: string; name: string; type?: string; description?: string; customer?: string; theme?: string; settings?: Record<string, unknown> } }>(`/api/admin/stations/${r}`).catch(() => null)),
        ]).then((results) => {
          const map = new Map<string, { name: string; type?: string; description?: string; customer?: string; theme?: string; settings?: Record<string, unknown> }>();
          for (const r of results) {
            if (!r) continue;
            const obj = ('game' in r ? r.game : 'station' in r ? r.station : null) as { _id: string; name: string; type?: string; description?: string; customer?: string; theme?: string; settings?: Record<string, unknown> } | null;
            if (obj && obj._id) map.set(obj._id.toString(), obj);
          }
          setSelectedItems((current) =>
            current.map((it) => {
              const fresh = map.get(it.ref);
              if (!fresh) return it;
              return {
                ...it,
                name: fresh.name ?? it.name,
                subType: fresh.type ?? it.subType,
                description: fresh.description ?? it.description,
                customer: fresh.customer ?? it.customer,
                theme: fresh.theme ?? it.theme,
                settings: fresh.settings ?? it.settings,
              };
            })
          );
        }).catch(() => { /* silent */ });
        return prev;
      });
    };
    const onVisible = () => { if (document.visibilityState === 'visible') refreshItems(); };
    window.addEventListener('focus', refreshItems);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refreshItems);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [id]);

  const toggleField = (field: LoginField) => {
    setLoginFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
        if (field === 'email') setEmailGoogle(false);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const adjustGroupCount = (delta: number) => {
    const newCount = Math.max(2, Math.min(50, groupCount + delta));
    setGroupCount(newCount);
    setGroupNames((prev) => {
      if (newCount > prev.length) {
        const extended = [...prev];
        for (let i = prev.length; i < newCount; i++) {
          extended.push(defaultGroupName(i + 1));
        }
        return extended;
      }
      return prev.slice(0, newCount);
    });
  };

  const updateGroupName = (index: number, value: string) => {
    setGroupNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addItem = (item: ModuleItem) => setSelectedItems((prev) => [...prev, item]);

  // Compute the total image limit for a collage station from its settings.
  // Mode-aware: multiSelect mode uses `multiSelectCount`; otherwise the mission
  // count. (Taking the max of both can over-count when both fields are set.)
  const getCollageLimit = (settings: Record<string, unknown> | undefined): number => {
    if (!settings) return 1;
    if (settings.multiSelect) {
      const raw = settings.multiSelectCount;
      const parsed = typeof raw === 'number'
        ? raw
        : (typeof raw === 'string' ? parseInt(raw, 10) : NaN);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    }
    const missions = settings.missions;
    return Array.isArray(missions) && missions.length > 0 ? missions.length : 1;
  };

  // Even distribution helper for legacy entries that only stored totalParts.
  const derivePartSizesEvenly = (total: number, parts: number): number[] => {
    const base = Math.floor(total / parts);
    const extras = total % parts;
    return Array.from({ length: parts }, (_, i) => Math.max(1, base + (i < extras ? 1 : 0)));
  };

  // Get the part-sizes array for a group member, falling back to even
  // distribution if the legacy totalParts shape is present. Also self-heals
  // when the stored partSizes don't sum to the current limit (e.g. limit was
  // reduced after the split was saved, or older buggy data) by redistributing
  // evenly across the same number of parts.
  const getPartSizes = (item: ModuleItem, limit: number): number[] => {
    const split = item.collageSplit;
    if (!split) return [limit];
    if (split.partSizes && split.partSizes.length > 0) {
      const sum = split.partSizes.reduce((a, b) => a + b, 0);
      if (sum === limit) return split.partSizes;
      // Stale — redistribute over the same number of parts to match the limit.
      return derivePartSizesEvenly(limit, split.partSizes.length);
    }
    if (split.totalParts && split.totalParts > 0) return derivePartSizesEvenly(limit, split.totalParts);
    return [limit];
  };

  // Walk items in order; for every item in `groupId`, overwrite collageSplit
  // with the new partSizes array and re-assign partIndex sequentially. When
  // videoPartIndex / photoOrder are provided they are stamped on every member.
  const applyGroupPartSizes = (
    items: ModuleItem[],
    groupId: string,
    partSizes: number[],
    videoPartIndex: number | null = null,
    photoOrder: number[] | null = null,
  ): ModuleItem[] => {
    let partIdx = 0;
    return items.map((it) => {
      if (it.collageSplit?.splitGroupId !== groupId) return it;
      return {
        ...it,
        collageSplit: {
          splitGroupId: groupId,
          partIndex: partIdx++,
          partSizes,
          ...(videoPartIndex !== null && { videoPartIndex }),
          ...(photoOrder !== null && { photoOrder }),
        },
      };
    });
  };

  // After a split part is removed: merge its allocation into a neighbor so the
  // total image count is preserved. If only one part remains, clear the split.
  const handleSplitPartRemoved = (items: ModuleItem[], removed: ModuleItem): ModuleItem[] => {
    const split = removed.collageSplit;
    if (!split) return items;
    const groupId = split.splitGroupId;
    const remainingCount = items.filter((it) => it.collageSplit?.splitGroupId === groupId).length;
    if (remainingCount === 0) return items;
    if (remainingCount === 1) {
      return items.map((it) =>
        it.collageSplit?.splitGroupId === groupId ? { ...it, collageSplit: undefined } : it,
      );
    }
    const limit = getCollageLimit(removed.settings);
    const oldSizes = getPartSizes(removed, limit);
    const removedIdx = split.partIndex;
    const removedSize = oldSizes[removedIdx] ?? 1;
    const sizesAfter = oldSizes.filter((_, i) => i !== removedIdx);
    if (sizesAfter.length === 0) return items;
    // Merge removed's images into the previous part (or the new first if it was first).
    const mergeInto = removedIdx === 0 ? 0 : removedIdx - 1;
    sizesAfter[mergeInto] = (sizesAfter[mergeInto] ?? 0) + removedSize;
    return applyGroupPartSizes(items, groupId, sizesAfter);
  };

  const removeItem = (index: number) => setSelectedItems((prev) => {
    const removed = prev[index];
    const next = prev.filter((_, i) => i !== index);
    if (removed?.collageSplit) return handleSplitPartRemoved(next, removed);
    return next;
  });

  // Open the split-editor popup for the collage station at `index`. The editor
  // shows every part in the same group at once and rebuilds the module items
  // array on Save (see applySplitEditorResult).
  const openSplitEditor = (index: number) => {
    const target = selectedItems[index];
    if (!target || target.itemType !== 'station' || target.subType !== 'collage') return;
    setSplitEditorIndex(index);
  };

  // Save handler: rebuild the group's module items to match the editor result.
  // - Adjusts item count to match result.partSizes.length (insert/remove).
  // - Stamps partSizes / videoPartIndex / photoOrder on every member.
  const applySplitEditorResult = (
    index: number,
    result: { partSizes: number[]; videoPartIndex: number | null; photoOrder: number[] },
  ) => {
    setSelectedItems((prev) => {
      const target = prev[index];
      if (!target || target.itemType !== 'station' || target.subType !== 'collage') return prev;

      // Ensure the group has an id (first time any split is saved on this item).
      const groupId = target.collageSplit?.splitGroupId
        ?? `csg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

      const groupIndices = prev
        .map((it, i) => (it.collageSplit?.splitGroupId === groupId || i === index ? i : -1))
        .filter((i) => i >= 0);
      // Anchor: where the group starts in the items array. If the item isn't
      // yet in the group (first split), use its own position as the anchor.
      const anchor = groupIndices[0] ?? index;
      const oldGroupLen = groupIndices.length || 1;
      const newGroupLen = result.partSizes.length;

      // Template item used for any newly-inserted parts — clone the clicked
      // item (same ref / settings / etc.) and let applyGroupPartSizes assign
      // a partIndex.
      const template: ModuleItem = { ...target, collageSplit: undefined };

      // Splice in `newGroupLen` clones starting at `anchor`, replacing the
      // existing `oldGroupLen` group members.
      const before = prev.slice(0, anchor);
      const after = prev.slice(anchor + oldGroupLen);
      const fresh: ModuleItem[] = Array.from({ length: newGroupLen }, () => ({
        ...template,
        collageSplit: { splitGroupId: groupId, partIndex: 0, partSizes: result.partSizes },
      }));
      const next = [...before, ...fresh, ...after];

      // photoOrder identity check — store only if it's an actual permutation
      // (not the trivial 0..N-1). Saves bytes on the wire for the common case.
      const isIdentity = result.photoOrder.every((v, i) => v === i);
      const photoOrder = isIdentity ? null : result.photoOrder;

      return applyGroupPartSizes(next, groupId, result.partSizes, result.videoPartIndex, photoOrder);
    });
    setSplitEditorIndex(null);
  };
  const updateItemLocation = (index: number, location: ItemLocation | undefined) => {
    setSelectedItems((prev) => prev.map((item, i) => (i === index ? { ...item, location } : item)));
  };

  const updateItemSvg = (index: number, svgUrl: string) => {
    setSelectedItems((prev) => prev.map((item, i) => i === index ? { ...item, spiderSvg: svgUrl || undefined } : item));
  };
  const toggleItemFinal = (index: number) => {
    setSelectedItems((prev) => {
      const isAlreadyFinal = prev[index]?.isFinal;
      return prev.map((item, i) => ({
        ...item,
        isFinal: isAlreadyFinal ? undefined : (i === index ? true : undefined),
      }));
    });
  };
  const toggleItemRevisitable = (index: number) => {
    setSelectedItems((prev) => prev.map((item, i) => (
      i === index ? { ...item, revisitable: item.revisitable ? undefined : true } : item
    )));
  };
  const moveItem = (index: number, direction: -1 | 1) => {
    setSelectedItems((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const addPopup = () => {
    setPopups((prev) => [...prev, {
      title: '', contentType: 'text' as PopupContentType, text: '', image: '', includeUsername: false,
      triggerPoint: 'afterLogin', itemIndex: 0, conditionType: 'none', threshold: 20, enabled: true,
    }]);
  };
  const removePopup = (index: number) => setPopups((prev) => prev.filter((_, i) => i !== index));
  const updatePopup = (index: number, field: keyof PopupMessage, value: string | number | boolean) => {
    setPopups((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const smsAvailable = connectionType === 'group' && groupEntryMode === 'selfService';
  const hasAnyField = loginFields.size > 0;
  const isWizard = isWizardModule(moduleType);

  // How many map-module items are still missing a location — drives the live
  // banner on the content step and the forward-navigation gate.
  const mapMissingLocationsCount = moduleType === 'map' ? selectedItems.filter((i) => !i.location).length : 0;

  // Which steps exist for this module type, in order. Steps 3-5 (content,
  // rules & texts, follow-up SMS) only apply when there's a module to fill
  // with items; the summary is always last.
  const stepSequence: StepId[] = isWizard ? [1, 2, 3, 4, 5, 6] : [1, 2, 6];

  // Whether each step can be reached going forward. Going back is always
  // allowed; going forward requires the previous step to be minimally valid,
  // so a broken configuration can't be carried all the way to submit.
  const canReachStep2 = name.trim().length > 0;
  const canReachStep3 = isWizard && canReachStep2 && hasAnyField;
  const canReachStep4 = canReachStep3 && selectedItems.length > 0 && mapMissingLocationsCount === 0;
  const canReachStep5 = isWizard ? canReachStep4 : (canReachStep2 && hasAnyField);
  const canReach: Record<StepId, boolean> = {
    1: true, 2: canReachStep2, 3: canReachStep3, 4: canReachStep4, 5: canReachStep5, 6: canReachStep5,
  };

  const currentStepIdx = stepSequence.indexOf(step);
  const nextStepId = stepSequence[currentStepIdx + 1];
  const prevStepId = stepSequence[currentStepIdx - 1];
  const nextDisabled = !nextStepId || !canReach[nextStepId];

  // A submit error belongs to the attempt that bounced you here, not to
  // wherever you navigate next — so any deliberate step change clears it.
  const goToStep = (s: StepId) => { setError(''); setStep(s); };
  const goNext = () => { if (nextStepId && canReach[nextStepId]) goToStep(nextStepId); };
  const goBack = () => { if (prevStepId) goToStep(prevStepId); };

  useEffect(() => {
    if (!stepSequence.includes(step)) setStep(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWizard, step]);

  const STEP_META: Record<StepId, { title: string; subtitle: string }> = {
    1: { title: t.step1Title, subtitle: t.step1Subtitle },
    2: { title: t.step2Title, subtitle: t.step2Subtitle },
    3: { title: t.step3Title, subtitle: t.step3Subtitle },
    4: { title: t.step4Title, subtitle: t.step4Subtitle },
    5: { title: t.step5Title, subtitle: t.step5Subtitle },
    6: { title: t.step6Title, subtitle: t.step6Subtitle },
  };

  const insertSmsVariable = (token: string) => {
    const el = smsTemplateRef.current;
    if (!el) {
      setGroupRewardMessage((prev) => prev + token);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = el.value.slice(0, start) + token + el.value.slice(end);
    setGroupRewardMessage(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleSendTestSms = async () => {
    setSmsTestFeedback(null);
    const phone = smsTestPhone.trim();
    if (!phone) return;
    const message = groupRewardMessage.trim();
    if (!message) {
      setSmsTestFeedback({ ok: false, msg: t.smsTestEmptyTemplate });
      return;
    }
    setSmsTestSending(true);
    try {
      await adminApiFetch<{ ok: boolean }>('/api/admin/sms/test', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: phone,
          message,
          attachmentUrl: groupRewardAttachmentUrl.trim() || undefined,
          couponCode: groupRewardCoupon.trim() || undefined,
        }),
      });
      setSmsTestFeedback({ ok: true, msg: t.smsTestSuccess });
    } catch (err) {
      setSmsTestFeedback({ ok: false, msg: err instanceof Error ? err.message : 'Send failed' });
    } finally {
      setSmsTestSending(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isEditMode && managerEmail.trim() && !managerPassword) {
      setError(t.managerPasswordRequired);
      setStep(2);
      return;
    }
    if (smsAvailable && groupRewardEnabled && !groupRewardCoupon.trim()) {
      setError(t.groupRewardCouponRequired);
      setStep(5);
      return;
    }
    if (smsAvailable && groupRewardEnabled && !groupRewardAttachmentUrl.trim()) {
      setError(t.groupRewardAttachmentRequired);
      setStep(5);
      return;
    }
    if (moduleType === 'map' && selectedItems.some((i) => !i.location)) {
      setError(t.mapMissingLocations);
      setStep(3);
      return;
    }
    if (isWizard && selectedItems.length === 0) {
      setError(t.step2ItemsRequired);
      setStep(3);
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        loginFields: Array.from(loginFields),
        connectionType,
      };

      if (loginFields.has('email') && emailGoogle) payload.emailGoogle = true;
      payload.smsForCollage = smsForCollage && loginFields.has('phoneNumber');
      if (payload.smsForCollage && smsForCollageMessage.trim()) {
        payload.smsForCollageMessage = smsForCollageMessage.trim();
      }
      payload.smsForCollageShare = payload.smsForCollage && smsForCollageShare;
      if (connectionType === 'group') {
        payload.groupEntryMode = groupEntryMode;
        if (groupEntryMode === 'preset') {
          payload.groups = groupNames.map((n) => ({ name: n.trim() || 'Group' }));
        } else {
          payload.groupMinMembers = groupMinMembers;
          payload.groupMaxMembers = groupMaxMembers > 0 ? groupMaxMembers : null;
          payload.groupReward = {
            enabled: groupRewardEnabled,
            couponCode: groupRewardCoupon.trim(),
            ...(groupRewardMessage.trim() && { messageTemplate: groupRewardMessage.trim() }),
            ...(groupRewardAttachmentUrl.trim() && {
              attachmentUrl: groupRewardAttachmentUrl.trim(),
              attachmentType: groupRewardAttachmentType,
            }),
          };
        }
      }
      if (openingType === 'none') {
        payload.opening = null;
      } else if (openingUrl.trim()) {
        payload.opening = { type: openingType, url: openingUrl.trim() };
      }
      // Orders are keyed by group name, so a renamed or deleted group leaves a
      // dead entry behind. The server ignores unknown groups already — this just
      // stops them accumulating in the document forever.
      const liveGroupOrders = (): Record<string, number[]> =>
        Object.fromEntries(
          groupNames
            .map((n) => n.trim() || 'Group')
            .filter((n) => groupOrders[n]?.length)
            .map((n) => [n, groupOrders[n]]),
        );

      if (isWizardModule(moduleType)) {
        const modulePayload: Record<string, unknown> = {
          type: moduleType,
          theme: moduleTheme || undefined,
          backgroundImage: backgroundImage.trim() || undefined,
          items: selectedItems.map((i) => ({
            type: i.itemType,
            ref: i.ref,
            ...(i.groups && i.groups.length > 0 && { groups: i.groups }),
            ...(moduleType === 'spiders' && i.spiderSvg && { spiderSvg: i.spiderSvg }),
            ...(moduleType === 'spiders' && i.isFinal && { isFinal: true }),
            ...(i.revisitable && { revisitable: true }),
            ...(i.collageSplit && { collageSplit: i.collageSplit }),
            ...(moduleType === 'map' && i.location && { location: i.location }),
          })),
          ...(moduleType === 'spiders' && showStationNumbers && { showStationNumbers: true }),
          ...(showItemTitleNumbers && { showItemTitleNumbers: true }),
          ...(moduleType === 'map' && { proximityMeters, groupOrders: liveGroupOrders() }),
        };
        if (popups.length > 0) {
          modulePayload.popups = popups
            .filter((p) => p.title.trim() && (p.contentType === 'image' ? p.image.trim() : p.text.trim()))
            .map((p) => ({
              title: p.title.trim(),
              contentType: p.contentType,
              ...(p.contentType === 'text' && { text: p.text.trim() }),
              ...(p.contentType === 'image' && { image: p.image.trim() }),
              ...(p.includeUsername && { includeUsername: true }),
              trigger: {
                point: p.triggerPoint,
                ...((['beforeItem', 'afterItem'].includes(p.triggerPoint)) && {
                  itemIndex:
                    selectedItems.length > 0
                      ? Math.min(Math.max(0, p.itemIndex), selectedItems.length - 1)
                      : 0,
                }),
              },
              ...(p.conditionType === 'participantCount' && {
                condition: { type: 'participantCount', threshold: p.threshold },
              }),
              enabled: p.enabled,
            }));
        }
        payload.module = modulePayload;
      }
      payload.guidelines = guidelines.trim() || undefined;
      payload.languages = languages.length > 0 ? languages : undefined;
      payload.organizerContactName = organizerContactName.trim() || undefined;
      payload.organizerContactPhone = organizerContactPhone.trim() || undefined;
      payload.extraSupportInfo = extraSupportInfo.trim() || undefined;
      payload.helpCategoriesDisabled = helpCategoriesDisabled.length > 0 ? helpCategoriesDisabled : undefined;
      payload.helpCategoryResponses = Object.keys(helpCategoryResponses).length > 0 ? helpCategoryResponses : undefined;
      payload.helpOtherCategoryEnabled = helpOtherCategoryEnabled;
      if (!useDefaultInstructions) {
        payload.customInstructions = {
          title: customInstructions.title?.trim() || undefined,
          missionTitle: customInstructions.missionTitle?.trim() || undefined,
          missionItems: customInstructions.missionItems?.filter((s) => s.trim()),
          guidelinesTitle: customInstructions.guidelinesTitle?.trim() || undefined,
          guidelineItems: customInstructions.guidelineItems?.filter((s) => s.trim()),
          buttonText: customInstructions.buttonText?.trim() || undefined,
        };
      }
      if (!alwaysOpen) {
        if (scheduledStart) payload.scheduledStart = new Date(scheduledStart).toISOString();
        if (scheduledEnd) payload.scheduledEnd = new Date(scheduledEnd).toISOString();
      }
      payload.leaderboardMode = leaderboardMode;
      payload.leaderboardAsGrade = leaderboardMode !== 'time' && leaderboardAsGrade;
      payload.hideLeaderboardInHeader = !displayLeaderboardInHeader;
      payload.leaderboardCurrentDayOnly = leaderboardCurrentDayOnly;
      payload.dailyReset = dailyReset;
      payload.userControl = userControl;
      // Time limit field is shown for both 'time' and 'both' modes — it drives
      // the live timer + warning popup in either case.
      if ((leaderboardMode === 'time' || leaderboardMode === 'both') && activityDurationMinutes.trim()) {
        const parsed = parseInt(activityDurationMinutes, 10);
        if (!isNaN(parsed) && parsed > 0) payload.activityDurationMinutes = parsed;
      }
      // Cosmetic roadmap timer (omitted when off → server clears it on edit).
      if (roadmapTimerEnabled && roadmapTimerMinutes.trim()) {
        const parsed = parseInt(roadmapTimerMinutes, 10);
        if (!isNaN(parsed) && parsed > 0) payload.roadmapTimerMinutes = parsed;
      }
      if (isContinuous) {
        payload.isContinuous = true;
        if (portalId) payload.portalId = portalId;
      }
      if (includeOnRoadmap) payload.includeOnRoadmap = true;
      if (managerEmail.trim()) {
        payload.managerEmail = managerEmail.trim();
        if (managerPassword) payload.managerPassword = managerPassword;
      }

      type SaveActivityResponse = {
        activity: { _id: string };
        managerProvision?: { ok: boolean; warning?: string };
      };

      if (isEditMode) {
        const data = await adminApiFetch<SaveActivityResponse>(`/api/admin/activities/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        navigate(`/admin/activities/${id}`, {
          state: data.managerProvision?.warning ? { managerProvisionWarning: data.managerProvision.warning } : undefined,
        });
      } else {
        const data = await adminApiFetch<SaveActivityResponse>('/api/admin/activities', { method: 'POST', body: JSON.stringify(payload) });
        navigate(`/admin/activities/${data.activity._id}`, {
          state: data.managerProvision?.warning ? { managerProvisionWarning: data.managerProvision.warning } : undefined,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return null;

  // ─── Step 6 summary — review values + any outstanding issue, each pointing
  // back to the step that fixes it. ───
  const moduleTypeLabel = moduleType === 'map' ? t.map : moduleType === 'spiders' ? t.spiders : moduleType === 'story' ? t.story : t.noModule;

  // Every theme the picker offers, and whichever one is currently selected —
  // the form shows only the selected one, collapsed to a single row.
  const themeOptions = [...builtInThemeOptions(t), ...customThemes.map(customThemeOption)];
  const selectedTheme = themeOptions.find((o) => o.id === moduleTheme) ?? themeOptions[0];
  const loginFieldLabel = (f: LoginField) => (f === 'name' ? t.fieldName : f === 'email' ? t.fieldEmail : t.fieldPhone);
  const loginFieldsSummary = Array.from(loginFields).map(loginFieldLabel).join(', ') || t.reviewNoneSet;

  const reviewIssues: { text: string; step: StepId }[] = [];
  if (!isEditMode && managerEmail.trim() && !managerPassword) {
    reviewIssues.push({ text: t.managerPasswordRequired, step: 2 });
  }
  if (isContinuous && !portalId) {
    reviewIssues.push({ text: t.portalRequired, step: 2 });
  }
  if (isWizard && selectedItems.length === 0) {
    reviewIssues.push({ text: t.step2ItemsRequired, step: 3 });
  }
  if (moduleType === 'map' && mapMissingLocationsCount > 0) {
    reviewIssues.push({
      text: t.mapLocationsMissingCount.replace('{count}', String(mapMissingLocationsCount)).replace('{total}', String(selectedItems.length)),
      step: 3,
    });
  }
  if (smsAvailable && groupRewardEnabled && !groupRewardCoupon.trim()) {
    reviewIssues.push({ text: t.groupRewardCouponRequired, step: 5 });
  }
  if (smsAvailable && groupRewardEnabled && !groupRewardAttachmentUrl.trim()) {
    reviewIssues.push({ text: t.groupRewardAttachmentRequired, step: 5 });
  }

  // A step is flagged on the rail only once it has been visited, and never
  // while you are standing on it — there the inline banner already says so.
  const stepsWithIssues = new Set(reviewIssues.map((i) => i.step));
  const stepHasIssue = (s: StepId) =>
    s !== step && visitedSteps.has(s) && stepsWithIssues.has(s);

  return (
    <AdminPage>
      <AdminHeader>
        <img src="/images/logo-purple.png" alt="Yooz" style={{ height: 32 }} />
        <OutlineButton onClick={() => navigate(isEditMode ? `/admin/activities/${id}` : '/admin/dashboard')}>{t.back}</OutlineButton>
      </AdminHeader>
      <AdminContent>
        <AdminCardForm>
          <PageTitle>{isEditMode ? t.editTitle : t.title}</PageTitle>

          <ProgressRail>
            {stepSequence.map((s, i) => {
              const state: 'done' | 'current' | 'upcoming' = s === step ? 'current' : (i < currentStepIdx ? 'done' : 'upcoming');
              return (
                <Fragment key={s}>
                  <ProgressStepBtn
                    type="button"
                    disabled={!canReach[s]}
                    onClick={() => canReach[s] && goToStep(s)}
                    title={stepHasIssue(s) ? t.stepHasIssues : undefined}
                  >
                    <ProgressCircle state={state}>
                      {i + 1}
                      {stepHasIssue(s) && <IssueDot />}
                    </ProgressCircle>
                    <ProgressLabel state={state}>{STEP_META[s].title}</ProgressLabel>
                  </ProgressStepBtn>
                  {i < stepSequence.length - 1 && <ProgressConnector done={i < currentStepIdx} />}
                </Fragment>
              );
            })}
          </ProgressRail>

          <StepIntro>
            <StepIntroTitle>{STEP_META[step].title}</StepIntroTitle>
            <StepIntroSubtitle>{STEP_META[step].subtitle}</StepIntroSubtitle>
          </StepIntro>

          {/* handleSubmit sends you back to the step that broke — steps 2, 3
            and 5 all get here, so the message is rendered once, for all of them. */}
          {error && <ErrorText>{error}</ErrorText>}

          <Form onSubmit={handleSubmit}>
            {/* ──── STEP 1 — Type & look ──── */}
            {step === 1 && (
              <>
                <NameInput
                  placeholder={t.activityName}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                {moduleType === 'story' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, marginTop: -8 }}>
                    <input
                      type="checkbox"
                      checked={includeOnRoadmap}
                      onChange={(e) => setIncludeOnRoadmap(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                    />
                    {t.includeOnRoadmap}
                  </label>
                )}

                <SectionCard>
                  <SectionHeader>
                    <SectionHeaderTitle>{t.moduleType}</SectionHeaderTitle>
                  </SectionHeader>
                  <ModuleTypeGrid>
                    <ModuleTypeCard type="button" selected={moduleType === 'map'} onClick={() => setModuleType('map')}>
                      <ModuleTypeCardTitle>{t.map}</ModuleTypeCardTitle>
                      <ModuleTypeCardDesc>{t.mapDesc}</ModuleTypeCardDesc>
                    </ModuleTypeCard>
                    <ModuleTypeCard type="button" selected={moduleType === 'spiders'} onClick={() => setModuleType('spiders')}>
                      <ModuleTypeCardTitle>{t.spiders}</ModuleTypeCardTitle>
                      <ModuleTypeCardDesc>{t.spidersDesc}</ModuleTypeCardDesc>
                    </ModuleTypeCard>
                    <ModuleTypeCard type="button" selected={moduleType === 'story'} onClick={() => setModuleType('story')}>
                      <ModuleTypeCardTitle>{t.story}</ModuleTypeCardTitle>
                      <ModuleTypeCardDesc>{t.storyDesc}</ModuleTypeCardDesc>
                    </ModuleTypeCard>
                    <ModuleTypeCard type="button" selected={moduleType === 'none'} onClick={() => setModuleType('none')}>
                      <ModuleTypeCardTitle>{t.noModule}</ModuleTypeCardTitle>
                      <ModuleTypeCardDesc>{t.noModuleDesc}</ModuleTypeCardDesc>
                    </ModuleTypeCard>
                  </ModuleTypeGrid>

                  {isWizardModule(moduleType) && (
                    <div style={{ marginTop: 4 }}>
                      <SectionLabelSmall>{t.themeLabel}</SectionLabelSmall>
                      <ThemeRow type="button" onClick={() => setThemePickerOpen(true)}>
                        <ThemeRowSwatch>
                          <ThemeSwatchTiny
                            scene={selectedTheme.scene}
                            road={selectedTheme.road}
                            node={selectedTheme.node}
                            image={selectedTheme.image}
                          />
                        </ThemeRowSwatch>
                        <ThemeRowName>{selectedTheme.name}</ThemeRowName>
                        <ThemeRowAction>{t.themeChange}</ThemeRowAction>
                      </ThemeRow>
                    </div>
                  )}
                </SectionCard>

                <SectionCardWide>
                  <SectionHeader>
                    <SectionHeaderTitle>{t.openingSection}</SectionHeaderTitle>
                  </SectionHeader>
                  <SectionDescription style={{ margin: 0 }}>{t.openingDesc}</SectionDescription>
                  <SelectionGroup>
                    <SelectionButton type="button" selected={openingType === 'none'} onClick={() => setOpeningType('none')}>
                      {t.openingNone}
                    </SelectionButton>
                    <SelectionButton type="button" selected={openingType === 'video'} onClick={() => setOpeningType('video')}>
                      {t.openingVideo}
                    </SelectionButton>
                    <SelectionButton type="button" selected={openingType === 'image'} onClick={() => setOpeningType('image')}>
                      {t.openingImage}
                    </SelectionButton>
                  </SelectionGroup>
                  {openingType !== 'none' && (
                    <InlineRowMt8>
                      <FileUploadButton
                        accept={openingType === 'video' ? 'video/*' : 'image/*'}
                        onUploaded={(url) => setOpeningUrl(url)}
                        label={t.upload}
                        uploadingLabel={t.uploading}
                      />
                      <FlexInput placeholder={t.openingUrl} value={openingUrl} onChange={(e) => setOpeningUrl(e.target.value)} />
                    </InlineRowMt8>
                  )}
                </SectionCardWide>

                <SectionCardWide>
                  <StepNav>
                    <div />
                    <PrimaryButton
                      type="button"
                      disabled={!canReachStep2}
                      onClick={goNext}
                      style={{ width: 'auto', padding: '12px 40px' }}
                    >
                      {t.nextStep}
                    </PrimaryButton>
                  </StepNav>
                </SectionCardWide>
              </>
            )}

            {/* ──── STEP 2 — Access & timing ──── */}
            {step === 2 && (
              <>
                <FormGrid>
                  {/* LEFT COLUMN */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <SectionCard>
                      <SectionHeader>
                        <SectionHeaderTitle>{t.loginFields}</SectionHeaderTitle>
                      </SectionHeader>
                      <SelectionGroup>
                        <SelectionButton type="button" selected={loginFields.has('name')} onClick={() => toggleField('name')}>
                          {t.fieldName}
                        </SelectionButton>
                        <SelectionButton type="button" selected={loginFields.has('email')} onClick={() => toggleField('email')}>
                          {t.fieldEmail}
                        </SelectionButton>
                        <SelectionButton type="button" selected={loginFields.has('phoneNumber')} onClick={() => toggleField('phoneNumber')}>
                          {t.fieldPhone}
                        </SelectionButton>
                      </SelectionGroup>
                      {loginFields.has('email') && (
                        <SelectionGroup>
                          <SelectionButton type="button" selected={emailGoogle} onClick={() => setEmailGoogle(!emailGoogle)}>
                            {t.allowGoogle}
                          </SelectionButton>
                        </SelectionGroup>
                      )}
                    </SectionCard>

                    <SectionCard>
                      <SectionHeader>
                        <SectionHeaderTitle>{t.connectionType}</SectionHeaderTitle>
                      </SectionHeader>
                      <SelectionGroup>
                        <SelectionButton type="button" selected={connectionType === 'single'} onClick={() => setConnectionType('single')}>
                          <div>{t.single}</div>
                          <SelectionSubtext>{t.singleDesc}</SelectionSubtext>
                        </SelectionButton>
                        <SelectionButton type="button" selected={connectionType === 'group'} onClick={() => setConnectionType('group')}>
                          <div>{t.group}</div>
                          <SelectionSubtext>{t.groupDesc}</SelectionSubtext>
                        </SelectionButton>
                      </SelectionGroup>
                      {connectionType === 'group' && (
                        <div>
                          <SectionLabel>{t.groupEntryMode}</SectionLabel>
                          <SelectionGroup>
                            <SelectionButton
                              type="button"
                              selected={groupEntryMode === 'preset'}
                              onClick={() => setGroupEntryMode('preset')}
                            >
                              <div>{t.groupEntryPreset}</div>
                              <SelectionSubtext>{t.groupEntryPresetDesc}</SelectionSubtext>
                            </SelectionButton>
                            <SelectionButton
                              type="button"
                              selected={groupEntryMode === 'selfService'}
                              onClick={() => setGroupEntryMode('selfService')}
                            >
                              <div>{t.groupEntrySelfService}</div>
                              <SelectionSubtext>{t.groupEntrySelfServiceDesc}</SelectionSubtext>
                            </SelectionButton>
                          </SelectionGroup>
                          {/* The after-activity SMS reward is gated on this choice
                              two steps later — say so here, where it is decided. */}
                          <SectionDescription style={{ margin: '8px 0 0' }}>
                            {groupEntryMode === 'selfService' ? t.smsUnlockedNote : t.smsGatedNote}
                          </SectionDescription>
                          {groupEntryMode === 'selfService' && (
                            <>
                              <SectionLabel>{t.groupMinMembers}</SectionLabel>
                              <CounterRow>
                                <CounterButton
                                  type="button"
                                  onClick={() => setGroupMinMembers((n) => Math.max(1, n - 1))}
                                >
                                  −
                                </CounterButton>
                                <CounterDisplay>{groupMinMembers}</CounterDisplay>
                                <CounterButton
                                  type="button"
                                  onClick={() => setGroupMinMembers((n) => Math.min(20, n + 1))}
                                >
                                  +
                                </CounterButton>
                              </CounterRow>
                              <SectionDescription style={{ margin: '8px 0 0' }}>{t.groupMinMembersDesc}</SectionDescription>
                              <SectionLabel style={{ marginTop: 16 }}>{t.groupMaxMembers}</SectionLabel>
                              <CounterRow>
                                <CounterButton
                                  type="button"
                                  onClick={() => setGroupMaxMembers((n) => Math.max(0, n - 1))}
                                >
                                  −
                                </CounterButton>
                                <CounterDisplay>{groupMaxMembers || '∞'}</CounterDisplay>
                                <CounterButton
                                  type="button"
                                  onClick={() => setGroupMaxMembers((n) => Math.min(100, n + 1))}
                                >
                                  +
                                </CounterButton>
                              </CounterRow>
                              <SectionDescription style={{ margin: '8px 0 0' }}>{t.groupMaxMembersDesc}</SectionDescription>
                            </>
                          )}
                          {groupEntryMode === 'preset' && (
                            <>
                              <SectionLabel>{t.groupConfig}</SectionLabel>
                              <CounterRow>
                                <CounterButton type="button" onClick={() => adjustGroupCount(-1)}>−</CounterButton>
                                <CounterDisplay>{groupCount}</CounterDisplay>
                                <CounterButton type="button" onClick={() => adjustGroupCount(1)}>+</CounterButton>
                              </CounterRow>
                              <VerticalStack>
                                {groupNames.map((gName, i) => (
                                  <Input key={i} value={gName} onChange={(e) => updateGroupName(i, e.target.value)} placeholder={`${t.groupDefault} ${i + 1}`} />
                                ))}
                              </VerticalStack>
                            </>
                          )}
                        </div>
                      )}
                    </SectionCard>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <SectionCard>
                      <SectionHeader>
                        <SectionHeaderTitle>{t.continuousActivity}</SectionHeaderTitle>
                      </SectionHeader>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={isContinuous}
                          onChange={(e) => {
                            setIsContinuous(e.target.checked);
                            if (!e.target.checked) setPortalId('');
                          }}
                          style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                        />
                        {t.continuousActivityDesc}
                      </label>
                      {isContinuous && (
                        <div>
                          <SectionLabelSmall>{t.selectPortal}</SectionLabelSmall>
                          <select
                            value={portalId}
                            onChange={(e) => setPortalId(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: 10,
                              border: '1.5px solid #ececf4',
                              fontSize: 14,
                              background: '#fafafe',
                              outline: 'none',
                            }}
                          >
                            <option value="">{t.selectPortalPlaceholder}</option>
                            {portals.map((p) => (
                              <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                            ))}
                          </select>
                          {isContinuous && !portalId && (
                            <span style={{ color: '#e74c3c', fontSize: 12, marginTop: 4, display: 'block' }}>{t.portalRequired}</span>
                          )}
                        </div>
                      )}
                    </SectionCard>

                    <SectionCard>
                      <SectionHeader>
                        <SectionHeaderTitle>{t.schedulingSection}</SectionHeaderTitle>
                      </SectionHeader>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={alwaysOpen}
                          onChange={(e) => {
                            setAlwaysOpen(e.target.checked);
                            if (e.target.checked) { setScheduledStart(''); setScheduledEnd(''); }
                          }}
                          style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                        />
                        {t.alwaysOpen}
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer', fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={dailyReset}
                          onChange={(e) => setDailyReset(e.target.checked)}
                          style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                        />
                        {t.dailyReset}
                      </label>
                      {dailyReset && (
                        <SectionDescription style={{ marginTop: 4, marginInlineStart: 26 }}>
                          {t.dailyResetHint}
                        </SectionDescription>
                      )}
                      {!alwaysOpen && (
                        <VerticalStack>
                          <div>
                            <SectionDescription>{t.scheduledStart}</SectionDescription>
                            <Input type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} />
                          </div>
                          <div>
                            <SectionDescription>{t.scheduledEnd}</SectionDescription>
                            <Input type="datetime-local" value={scheduledEnd} onChange={(e) => setScheduledEnd(e.target.value)} />
                          </div>
                        </VerticalStack>
                      )}

                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, cursor: 'pointer', fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={roadmapTimerEnabled}
                          onChange={(e) => setRoadmapTimerEnabled(e.target.checked)}
                          style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                        />
                        {t.roadmapTimerEnable}
                      </label>
                      {roadmapTimerEnabled && (
                        <Input
                          type="number"
                          placeholder={t.roadmapTimerPlaceholder}
                          value={roadmapTimerMinutes}
                          onChange={(e) => setRoadmapTimerMinutes(e.target.value)}
                          style={{ maxWidth: 140, marginTop: 8 }}
                        />
                      )}
                    </SectionCard>

                    <SectionCard>
                      <SectionHeader>
                        <SectionHeaderTitle>{t.managerSection}</SectionHeaderTitle>
                      </SectionHeader>
                      <VerticalStack>
                        <SectionDescription>{t.managerHelperText}</SectionDescription>
                        <Input type="email" placeholder={t.managerEmail} value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} />
                        <Input
                          type="password"
                          placeholder={isEditMode && managerEmail ? t.managerPasswordPlaceholder : t.managerPassword}
                          value={managerPassword}
                          onChange={(e) => setManagerPassword(e.target.value)}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                          <input
                            type="checkbox"
                            checked={userControl}
                            onChange={(e) => setUserControl(e.target.checked)}
                            style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                          />
                          {t.userControl}
                        </label>
                      </VerticalStack>
                    </SectionCard>
                  </div>
                </FormGrid>

                <SectionCardWide>
                  <CollapsibleSectionHeader
                    type="button"
                    onClick={() => setHelpChatSectionExpanded((was) => !was)}
                    aria-expanded={helpChatSectionExpanded}
                  >
                    <div>
                      <SectionHeaderTitle>{t.helpChatSectionTitle}</SectionHeaderTitle>
                      {!helpChatSectionExpanded && (
                        <SectionDescription style={{ margin: '4px 0 0' }}>
                          {t.helpChatSectionCollapsedDesc}
                        </SectionDescription>
                      )}
                    </div>
                    <CollapseChevron expanded={helpChatSectionExpanded} />
                  </CollapsibleSectionHeader>

                  {helpChatSectionExpanded && (
                    <>
                      <SectionHeader>
                        <SectionHeaderTitle>{t.organizerContactSection}</SectionHeaderTitle>
                      </SectionHeader>
                      <SectionDescription style={{ margin: 0 }}>{t.organizerContactDesc}</SectionDescription>
                      <FormGrid style={{ marginTop: 8 }}>
                        <Input
                          placeholder={t.organizerContactNamePlaceholder}
                          value={organizerContactName}
                          onChange={(e) => setOrganizerContactName(e.target.value)}
                        />
                        <Input
                          type="tel"
                          placeholder={t.organizerContactPhonePlaceholder}
                          value={organizerContactPhone}
                          onChange={(e) => setOrganizerContactPhone(e.target.value)}
                        />
                      </FormGrid>

                      <SectionHeader style={{ marginTop: 14 }}>
                        <SectionHeaderTitle>{t.helpCategoriesSection}</SectionHeaderTitle>
                      </SectionHeader>
                      <SectionDescription style={{ margin: 0 }}>{t.helpCategoriesDesc}</SectionDescription>
                      <VerticalStack style={{ marginTop: 8, gap: 14 }}>
                    {HELP_CATEGORIES.map((cat) => {
                      const checked = !helpCategoriesDisabled.includes(cat.key);
                      return (
                        <div
                          key={cat.key}
                          style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, opacity: checked ? 1 : 0.5 }}
                        >
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#444', fontWeight: 600 }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setHelpCategoriesDisabled((prev) =>
                                  e.target.checked ? prev.filter((k) => k !== cat.key) : [...prev, cat.key]
                                )
                              }
                              style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                            />
                            {lang === 'he' ? cat.labelHe : cat.labelEn}
                          </label>
                          {checked && (
                            <>
                              <SectionDescription style={{ margin: '8px 0 4px', fontSize: 12 }}>
                                {t.helpCategoryCustomLabel}
                              </SectionDescription>
                              <TextArea
                                placeholder={cat.defaultHe}
                                value={helpCategoryResponses[cat.key] || ''}
                                onChange={(e) =>
                                  setHelpCategoryResponses((prev) => {
                                    const next = { ...prev };
                                    if (e.target.value) next[cat.key] = e.target.value;
                                    else delete next[cat.key];
                                    return next;
                                  })
                                }
                                rows={2}
                              />
                            </>
                          )}
                        </div>
                      );
                    })}

                    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#444', fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={helpOtherCategoryEnabled}
                          onChange={(e) => setHelpOtherCategoryEnabled(e.target.checked)}
                          style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                        />
                        {t.otherCategoryLabel}
                      </label>
                      <SectionDescription style={{ margin: '4px 0 0', fontSize: 12 }}>
                        {t.otherCategoryDesc}
                      </SectionDescription>
                      {helpOtherCategoryEnabled && (
                        <>
                          <SectionDescription style={{ margin: '8px 0 4px', fontSize: 12 }}>
                            {t.extraSupportInfoLabel}
                          </SectionDescription>
                          <SectionDescription style={{ margin: '0 0 4px', fontSize: 12, color: '#888' }}>
                            {t.extraSupportInfoDesc}
                          </SectionDescription>
                          <TextArea
                            placeholder={t.extraSupportInfoPlaceholder}
                            value={extraSupportInfo}
                            onChange={(e) => setExtraSupportInfo(e.target.value)}
                            rows={4}
                          />
                        </>
                      )}
                    </div>
                      </VerticalStack>
                    </>
                  )}
                </SectionCardWide>

                <SectionCardWide>
                  <StepNav>
                    <OutlineButton type="button" onClick={goBack}>
                      {t.prevStep}
                    </OutlineButton>
                    <PrimaryButton
                      type="button"
                      disabled={nextDisabled}
                      onClick={goNext}
                      style={{ width: 'auto', padding: '12px 40px' }}
                    >
                      {t.nextStep}
                    </PrimaryButton>
                  </StepNav>
                </SectionCardWide>
              </>
            )}

            {/* ──── STEP 3 — Content ──── */}
            {step === 3 && isWizard && (
              <>
                <SectionCardWide>
                  {selectedItems.length === 0 && (
                    <IssueBanner><span>{t.step2ItemsRequired}</span></IssueBanner>
                  )}
                  {moduleType === 'map' && mapMissingLocationsCount > 0 && (
                    <IssueBanner>
                      <span>{t.mapLocationsMissingCount.replace('{count}', String(mapMissingLocationsCount)).replace('{total}', String(selectedItems.length))}</span>
                    </IssueBanner>
                  )}
                  <div style={{ marginTop: (selectedItems.length === 0 || mapMissingLocationsCount > 0) ? 14 : 0 }}>
                    <ModuleItemsSection
                      backgroundImage={backgroundImage}
                      setBackgroundImage={setBackgroundImage}
                      selectedItems={selectedItems}
                      onAddItem={addItem}
                      onRemoveItem={removeItem}
                      onMoveItem={moveItem}
                      onUpdateItemGroups={(index, groups) => setSelectedItems((prev) => prev.map((item, i) => i === index ? { ...item, groups } : item))}
                      onUpdateItemSvg={updateItemSvg}
                      onToggleItemFinal={toggleItemFinal}
                      onToggleItemRevisitable={toggleItemRevisitable}
                      onConfigureCollageSplit={openSplitEditor}
                      moduleType={moduleType}
                      connectionType={connectionType}
                      groupNames={groupNames}
                      onUpdateItemLocation={updateItemLocation}
                      t={t}
                    />
                  </div>
                  {moduleType === 'map' && (
                    <div style={{ marginTop: 12 }}>
                      <SectionLabelSmall>{t.mapProximity}</SectionLabelSmall>
                      <Input
                        type="number"
                        min={5}
                        max={200}
                        value={proximityMeters}
                        onChange={(e) => setProximityMeters(Math.max(5, Math.min(200, Number(e.target.value) || DEFAULT_PROXIMITY_METERS)))}
                        style={{ maxWidth: 120 }}
                      />
                      <SectionDescription style={{ marginTop: 4 }}>{t.mapProximityHint}</SectionDescription>
                    </div>
                  )}
                  {moduleType === 'map' && connectionType === 'group' && (
                    <GroupOrderEditor
                      groupNames={groupNames}
                      items={selectedItems}
                      orders={groupOrders}
                      setOrders={setGroupOrders}
                      selfService={groupEntryMode === 'selfService'}
                      t={t}
                    />
                  )}
                  {moduleType === 'spiders' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, marginTop: 12 }}>
                      <input
                        type="checkbox"
                        checked={showStationNumbers}
                        onChange={(e) => setShowStationNumbers(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                      />
                      {t.showStationNumbers}
                    </label>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, marginTop: 12 }}>
                    <input
                      type="checkbox"
                      checked={showItemTitleNumbers}
                      onChange={(e) => setShowItemTitleNumbers(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                    />
                    {t.showItemTitleNumbers}
                  </label>
                </SectionCardWide>

                <SectionCardWide>
                  <StepNav>
                    <OutlineButton type="button" onClick={goBack}>
                      {t.prevStep}
                    </OutlineButton>
                    <PrimaryButton
                      type="button"
                      disabled={nextDisabled}
                      onClick={goNext}
                      style={{ width: 'auto', padding: '12px 40px' }}
                    >
                      {t.nextStep}
                    </PrimaryButton>
                  </StepNav>
                </SectionCardWide>
              </>
            )}

            {/* ──── STEP 4 — Rules & texts ──── */}
            {step === 4 && isWizard && (
              <>
                <SectionCardWide>
                  <SectionHeader>
                    <SectionHeaderTitle>{t.leaderboardModeSection}</SectionHeaderTitle>
                  </SectionHeader>
                  <SectionDescription style={{ margin: 0 }}>{t.leaderboardModeDesc}</SectionDescription>
                  <SelectionGroup>
                    <SelectionButton type="button" selected={leaderboardMode === 'points'} onClick={() => setLeaderboardMode('points')}>
                      {t.leaderboardModePoints}
                    </SelectionButton>
                    <SelectionButton type="button" selected={leaderboardMode === 'time'} onClick={() => setLeaderboardMode('time')}>
                      {t.leaderboardModeTime}
                    </SelectionButton>
                    <SelectionButton type="button" selected={leaderboardMode === 'both'} onClick={() => setLeaderboardMode('both')}>
                      {t.leaderboardModeBoth}
                    </SelectionButton>
                  </SelectionGroup>
                  {(leaderboardMode === 'time' || leaderboardMode === 'both') && (
                    <>
                      <SectionDescription style={{ margin: '4px 0 0', color: '#6c5ce7', fontSize: 13 }}>
                        {leaderboardMode === 'both' ? t.leaderboardModeBothDesc : t.leaderboardModeTimeDesc}
                      </SectionDescription>
                      <SectionLabelSmall style={{ marginTop: 12 }}>{t.activityDurationLabel}</SectionLabelSmall>
                      <Input
                        type="number"
                        placeholder={t.activityDurationPlaceholder}
                        value={activityDurationMinutes}
                        onChange={(e) => setActivityDurationMinutes(e.target.value)}
                        style={{ maxWidth: 140 }}
                      />
                      {activityDurationMinutes.trim() && (
                        <SectionDescription style={{ margin: '4px 0 0', color: '#888', fontSize: 12 }}>
                          {t.activityDurationHint}
                        </SectionDescription>
                      )}
                    </>
                  )}
                  {leaderboardMode !== 'time' && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, cursor: 'pointer', fontSize: 14, color: '#444' }}>
                        <input
                          type="checkbox"
                          checked={leaderboardAsGrade}
                          onChange={(e) => setLeaderboardAsGrade(e.target.checked)}
                          style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                        />
                        {t.leaderboardAsGrade}
                      </label>
                      <SectionDescription style={{ margin: '4px 0 0', color: '#888', fontSize: 12 }}>
                        {t.leaderboardAsGradeDesc}
                      </SectionDescription>
                    </>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, cursor: 'pointer', fontSize: 14, color: '#444' }}>
                    <input
                      type="checkbox"
                      checked={displayLeaderboardInHeader}
                      onChange={(e) => setDisplayLeaderboardInHeader(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                    />
                    {t.displayLeaderboardInHeader}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer', fontSize: 14, color: '#444' }}>
                    <input
                      type="checkbox"
                      checked={leaderboardCurrentDayOnly}
                      onChange={(e) => setLeaderboardCurrentDayOnly(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                    />
                    {t.leaderboardCurrentDayOnly}
                  </label>
                </SectionCardWide>

                <SectionCardWide>
                  <SectionHeader>
                    <SectionHeaderTitle>{t.languagesSection}</SectionHeaderTitle>
                  </SectionHeader>
                  <SectionDescription style={{ margin: 0 }}>{t.languagesDesc}</SectionDescription>
                  {LANGS.filter((l) => l.code !== 'he').map((l) => (
                    <label key={l.code} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, marginTop: 4 }}>
                      <input
                        type="checkbox"
                        checked={languages.includes(l.code)}
                        onChange={(e) =>
                          setLanguages((prev) =>
                            e.target.checked ? [...prev, l.code] : prev.filter((c) => c !== l.code),
                          )
                        }
                      />
                      {l.label}
                    </label>
                  ))}
                </SectionCardWide>

                <SectionCardWide>
                  <SectionHeader>
                    <SectionHeaderTitle>{t.guidelinesSection}</SectionHeaderTitle>
                  </SectionHeader>
                  <SectionDescription style={{ margin: 0 }}>{t.guidelinesDesc}</SectionDescription>
                  <TextArea
                    placeholder={t.guidelinesPlaceholder}
                    value={guidelines}
                    onChange={(e) => setGuidelines(e.target.value)}
                    rows={3}
                  />
                </SectionCardWide>

                <SectionCardWide>
                  <SectionHeader>
                    <SectionHeaderTitle>{t.instructionsSection}</SectionHeaderTitle>
                  </SectionHeader>
                  <SectionDescription style={{ margin: 0 }}>{t.instructionsDesc}</SectionDescription>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, marginTop: 4 }}>
                    <input
                      type="checkbox"
                      checked={useDefaultInstructions}
                      onChange={(e) => setUseDefaultInstructions(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                    />
                    {t.useDefaultInstructions}
                  </label>
                  {!useDefaultInstructions && (
                    <VerticalStack style={{ marginTop: 8 }}>
                      <div>
                        <SectionLabelSmall>{t.customInstructionsTitle}</SectionLabelSmall>
                        <Input
                          placeholder={t.customInstructionsTitlePlaceholder}
                          value={customInstructions.title || ''}
                          onChange={(e) => setCustomInstructions((prev) => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <FormGrid>
                        <div>
                          <SectionLabelSmall>{t.customMissionTitle}</SectionLabelSmall>
                          <Input
                            placeholder={t.customMissionTitlePlaceholder}
                            value={customInstructions.missionTitle || ''}
                            onChange={(e) => setCustomInstructions((prev) => ({ ...prev, missionTitle: e.target.value }))}
                          />
                          <SectionLabelSmall style={{ marginTop: 8 }}>{t.customMissionItems}</SectionLabelSmall>
                          {(customInstructions.missionItems || ['']).map((item, i) => (
                            <InlineRowGap12 key={i} style={{ marginBottom: 6 }}>
                              <FlexInput
                                placeholder={t.customMissionItemPlaceholder}
                                value={item}
                                onChange={(e) => {
                                  const items = [...(customInstructions.missionItems || [''])];
                                  items[i] = e.target.value;
                                  setCustomInstructions((prev) => ({ ...prev, missionItems: items }));
                                }}
                              />
                              {(customInstructions.missionItems || []).length > 1 && (
                                <OutlineButton
                                  type="button"
                                  style={{ fontSize: 12, padding: '4px 10px', whiteSpace: 'nowrap' }}
                                  onClick={() => {
                                    const items = (customInstructions.missionItems || []).filter((_, idx) => idx !== i);
                                    setCustomInstructions((prev) => ({ ...prev, missionItems: items }));
                                  }}
                                >
                                  {t.removeItem}
                                </OutlineButton>
                              )}
                            </InlineRowGap12>
                          ))}
                          <OutlineButton
                            type="button"
                            style={{ fontSize: 12, padding: '4px 14px', marginTop: 2 }}
                            onClick={() => setCustomInstructions((prev) => ({ ...prev, missionItems: [...(prev.missionItems || []), ''] }))}
                          >
                            + {t.addMissionItem}
                          </OutlineButton>
                        </div>
                        <div>
                          <SectionLabelSmall>{t.customGuidelinesTitle}</SectionLabelSmall>
                          <Input
                            placeholder={t.customGuidelinesTitlePlaceholder}
                            value={customInstructions.guidelinesTitle || ''}
                            onChange={(e) => setCustomInstructions((prev) => ({ ...prev, guidelinesTitle: e.target.value }))}
                          />
                          <SectionLabelSmall style={{ marginTop: 8 }}>{t.customGuidelineItems}</SectionLabelSmall>
                          {(customInstructions.guidelineItems || ['']).map((item, i) => (
                            <InlineRowGap12 key={i} style={{ marginBottom: 6 }}>
                              <FlexInput
                                placeholder={t.customGuidelineItemPlaceholder}
                                value={item}
                                onChange={(e) => {
                                  const items = [...(customInstructions.guidelineItems || [''])];
                                  items[i] = e.target.value;
                                  setCustomInstructions((prev) => ({ ...prev, guidelineItems: items }));
                                }}
                              />
                              {(customInstructions.guidelineItems || []).length > 1 && (
                                <OutlineButton
                                  type="button"
                                  style={{ fontSize: 12, padding: '4px 10px', whiteSpace: 'nowrap' }}
                                  onClick={() => {
                                    const items = (customInstructions.guidelineItems || []).filter((_, idx) => idx !== i);
                                    setCustomInstructions((prev) => ({ ...prev, guidelineItems: items }));
                                  }}
                                >
                                  {t.removeItem}
                                </OutlineButton>
                              )}
                            </InlineRowGap12>
                          ))}
                          <OutlineButton
                            type="button"
                            style={{ fontSize: 12, padding: '4px 14px', marginTop: 2 }}
                            onClick={() => setCustomInstructions((prev) => ({ ...prev, guidelineItems: [...(prev.guidelineItems || []), ''] }))}
                          >
                            + {t.addGuidelineItem}
                          </OutlineButton>
                        </div>
                      </FormGrid>
                      <div>
                        <SectionLabelSmall>{t.customButtonText}</SectionLabelSmall>
                        <Input
                          placeholder={t.customButtonTextPlaceholder}
                          value={customInstructions.buttonText || ''}
                          onChange={(e) => setCustomInstructions((prev) => ({ ...prev, buttonText: e.target.value }))}
                        />
                      </div>
                    </VerticalStack>
                  )}
                </SectionCardWide>

                <SectionCardWide>
                  <PopupMessagesSection
                    popups={popups}
                    selectedItems={selectedItems}
                    onAddPopup={addPopup}
                    onRemovePopup={removePopup}
                    onUpdatePopup={updatePopup}
                    t={t}
                  />
                </SectionCardWide>

                <SectionCardWide>
                  <StepNav>
                    <OutlineButton type="button" onClick={goBack}>
                      {t.prevStep}
                    </OutlineButton>
                    <PrimaryButton
                      type="button"
                      disabled={nextDisabled}
                      onClick={goNext}
                      style={{ width: 'auto', padding: '12px 40px' }}
                    >
                      {t.nextStep}
                    </PrimaryButton>
                  </StepNav>
                </SectionCardWide>
              </>
            )}

            {/* ──── STEP 5 — Follow-up (SMS) ──── */}
            {step === 5 && (
              <>
                {isWizard && (
                  <SectionCardWide>
                    <SectionHeader>
                      <SectionHeaderTitle>{t.smsSectionTitle}</SectionHeaderTitle>
                    </SectionHeader>

                    <SubBlock>
                      <SectionLabelSmall style={{ marginBottom: 0 }}>{t.smsCollageBlockTitle}</SectionLabelSmall>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: loginFields.has('phoneNumber') ? 'pointer' : 'not-allowed',
                        fontSize: 14,
                        opacity: loginFields.has('phoneNumber') ? 1 : 0.55,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={smsForCollage && loginFields.has('phoneNumber')}
                        disabled={!loginFields.has('phoneNumber')}
                        onChange={(e) => setSmsForCollage(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                      />
                      {t.smsForCollage}
                    </label>
                    <SectionDescription style={{ margin: 0 }}>
                      {loginFields.has('phoneNumber') ? t.smsForCollageHint : t.smsForCollageNeedsPhone}
                    </SectionDescription>

                    {smsForCollage && loginFields.has('phoneNumber') && (
                      <div style={{ marginTop: 4 }}>
                        <SectionLabelSmall>{t.smsForCollageMessageLabel}</SectionLabelSmall>
                        <SmsTemplateArea
                          placeholder={t.smsForCollageMessagePlaceholder}
                          value={smsForCollageMessage}
                          onChange={(e) => setSmsForCollageMessage(e.target.value)}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, marginTop: 10 }}>
                          <input
                            type="checkbox"
                            checked={smsForCollageShare}
                            onChange={(e) => setSmsForCollageShare(e.target.checked)}
                            style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                          />
                          {t.smsSharePageLabel}
                        </label>
                        {smsForCollageShare && (
                          <SectionDescription style={{ margin: '4px 0 0' }}>{t.smsSharePageDesc}</SectionDescription>
                        )}
                      </div>
                    )}
                    </SubBlock>

                    <SubBlock>
                      <SectionLabelSmall style={{ marginBottom: 0 }}>{t.groupReward}</SectionLabelSmall>
                      <SectionDescription style={{ margin: 0 }}>{t.afterActivitySmsDesc}</SectionDescription>

                    {!smsAvailable && (
                      <SectionDescription style={{ margin: 0, color: '#e67e22' }}>
                        {t.smsNotAvailable}
                      </SectionDescription>
                    )}

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: smsAvailable ? 'pointer' : 'not-allowed',
                        fontSize: 14,
                        opacity: smsAvailable ? 1 : 0.55,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={groupRewardEnabled}
                        disabled={!smsAvailable}
                        onChange={(e) => setGroupRewardEnabled(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                      />
                      {t.afterActivitySms}
                    </label>

                    {groupRewardEnabled && smsAvailable && (
                      <VerticalStack style={{ marginTop: 4 }}>
                        <div>
                          <SectionLabelSmall>{t.groupRewardCoupon}</SectionLabelSmall>
                          <Input
                            placeholder={t.groupRewardCoupon}
                            value={groupRewardCoupon}
                            onChange={(e) => setGroupRewardCoupon(e.target.value)}
                          />
                        </div>
                        <div>
                          <SectionLabelSmall>{t.smsAttachmentLabel}</SectionLabelSmall>
                          <SectionDescription style={{ margin: '0 0 8px' }}>{t.smsAttachmentDesc}</SectionDescription>
                          <InlineRowGap12 style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                            <FileUploadButton
                              accept="image/*,.pdf,application/pdf"
                              label={t.smsAttachmentUpload}
                              uploadingLabel={t.uploading}
                              onUploaded={(url, file) => {
                                setGroupRewardAttachmentUrl(url);
                                const isPdf = file?.type === 'application/pdf'
                                  || file?.name?.toLowerCase().endsWith('.pdf');
                                setGroupRewardAttachmentType(isPdf ? 'pdf' : 'image');
                              }}
                            />
                            {groupRewardAttachmentUrl && (
                              <OutlineButton
                                type="button"
                                style={{ fontSize: 12, padding: '6px 12px' }}
                                onClick={() => {
                                  setGroupRewardAttachmentUrl('');
                                  setGroupRewardAttachmentType('image');
                                }}
                              >
                                {t.smsAttachmentRemove}
                              </OutlineButton>
                            )}
                          </InlineRowGap12>
                          {groupRewardAttachmentUrl && groupRewardAttachmentType === 'image' && (
                            <img
                              src={groupRewardAttachmentUrl}
                              alt=""
                              style={{ marginTop: 10, maxWidth: 200, maxHeight: 120, borderRadius: 8, objectFit: 'cover' }}
                            />
                          )}
                          {groupRewardAttachmentUrl && groupRewardAttachmentType === 'pdf' && (
                            <SectionDescription style={{ margin: '8px 0 0' }}>{t.smsAttachmentPdfReady}</SectionDescription>
                          )}
                        </div>
                        <div>
                          <SectionLabelSmall>{t.smsTemplateLabel}</SectionLabelSmall>
                          <SmsTemplateArea
                            ref={smsTemplateRef}
                            placeholder={t.groupRewardMessagePlaceholder}
                            value={groupRewardMessage}
                            onChange={(e) => setGroupRewardMessage(e.target.value)}
                          />
                          <SectionDescription style={{ margin: '8px 0' }}>{t.groupRewardMessageHint}</SectionDescription>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {(['{name}', '{score}', '{coupon}', '{group}', '{link}'] as const).map((token) => (
                              <SmsVarChip key={token} type="button" onClick={() => insertSmsVariable(token)}>
                                {token}
                              </SmsVarChip>
                            ))}
                          </div>
                        </div>
                        <SectionDescription style={{ margin: 0, fontSize: 13, color: '#6c5ce7' }}>
                          {t.smsPreviewHint}
                        </SectionDescription>

                        {canSendTestSms && (
                        <div style={{ marginTop: 8, padding: 14, borderRadius: 12, background: '#f1f8f4', border: '1px solid #cde9d6' }}>
                          <SectionLabelSmall style={{ marginBottom: 4 }}>{t.smsTestTitle}</SectionLabelSmall>
                          <SectionDescription style={{ margin: '0 0 10px' }}>{t.smsTestDesc}</SectionDescription>
                          <InlineRowGap12 style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                            <Input
                              type="tel"
                              placeholder={t.smsTestPhonePlaceholder}
                              value={smsTestPhone}
                              onChange={(e) => setSmsTestPhone(e.target.value)}
                              style={{ flex: '1 1 200px', minWidth: 180 }}
                            />
                            <button
                              type="button"
                              onClick={handleSendTestSms}
                              disabled={smsTestSending || !smsTestPhone.trim()}
                              style={{
                                padding: '10px 18px',
                                fontSize: 14,
                                fontWeight: 700,
                                color: '#fff',
                                background: '#27ae60',
                                border: 'none',
                                borderRadius: 8,
                                cursor: smsTestSending || !smsTestPhone.trim() ? 'not-allowed' : 'pointer',
                                opacity: smsTestSending || !smsTestPhone.trim() ? 0.6 : 1,
                                fontFamily: 'inherit',
                              }}
                            >
                              {smsTestSending ? t.smsTestSending : t.smsTestSend}
                            </button>
                          </InlineRowGap12>
                          {smsTestFeedback && (
                            <SectionDescription style={{ margin: '8px 0 0', color: smsTestFeedback.ok ? '#27ae60' : '#e74c3c' }}>
                              {smsTestFeedback.msg}
                            </SectionDescription>
                          )}
                        </div>
                        )}
                      </VerticalStack>
                    )}
                    </SubBlock>
                  </SectionCardWide>
                )}

                <SectionCardWide>
                  <StepNav>
                    <OutlineButton type="button" onClick={goBack}>
                      {t.prevStep}
                    </OutlineButton>
                    <PrimaryButton
                      type="button"
                      disabled={nextDisabled}
                      onClick={goNext}
                      style={{ width: 'auto', padding: '12px 40px' }}
                    >
                      {t.nextStep}
                    </PrimaryButton>
                  </StepNav>
                </SectionCardWide>
              </>
            )}

            {/* ──── STEP 6 — Summary ──── */}
            {step === 6 && (
              <>
                <SectionCardWide>
                  <SectionHeader>
                    <SectionHeaderTitle>{t.reviewTitle}</SectionHeaderTitle>
                  </SectionHeader>
                  <ReviewRow>
                    <ReviewLabel>{t.reviewLabelName}</ReviewLabel>
                    <ReviewValue>{name.trim() || t.reviewNoneSet}</ReviewValue>
                  </ReviewRow>
                  <ReviewRow>
                    <ReviewLabel>{t.reviewLabelType}</ReviewLabel>
                    <ReviewValue>{moduleTypeLabel}</ReviewValue>
                  </ReviewRow>
                  {isWizard && (
                    <ReviewRow>
                      <ReviewLabel>{t.reviewLabelItems}</ReviewLabel>
                      <ReviewValue>{selectedItems.length}</ReviewValue>
                    </ReviewRow>
                  )}
                  <ReviewRow>
                    <ReviewLabel>{t.reviewLabelLogin}</ReviewLabel>
                    <ReviewValue>{loginFieldsSummary}</ReviewValue>
                  </ReviewRow>
                  {connectionType === 'group' && (
                    <ReviewRow>
                      <ReviewLabel>{t.reviewLabelGroups}</ReviewLabel>
                      <ReviewValue>{groupNames.length}</ReviewValue>
                    </ReviewRow>
                  )}
                  <ReviewRow>
                    <ReviewLabel>{t.reviewLabelSchedule}</ReviewLabel>
                    <ReviewValue>{alwaysOpen ? t.reviewScheduleAlways : t.reviewScheduleWindow}</ReviewValue>
                  </ReviewRow>
                  <ReviewRow style={{ borderBottom: 'none' }}>
                    <ReviewLabel>{t.reviewLabelManager}</ReviewLabel>
                    <ReviewValue>{managerEmail.trim() || t.reviewNoneSet}</ReviewValue>
                  </ReviewRow>

                  {reviewIssues.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <SectionDescription style={{ margin: '4px 0 0', fontWeight: 700, color: '#c0392b' }}>
                        {t.reviewIssuesTitle}
                      </SectionDescription>
                      {reviewIssues.map((issue, i) => (
                        <IssueBanner key={i}>
                          <span>{issue.text}</span>
                          <IssueBannerLink type="button" onClick={() => goToStep(issue.step)}>
                            {t.fixIssueLink}
                          </IssueBannerLink>
                        </IssueBanner>
                      ))}
                    </div>
                  )}
                </SectionCardWide>

                <SectionCardWide>
                  <StepNav>
                    <OutlineButton type="button" onClick={goBack}>
                      {t.prevStep}
                    </OutlineButton>
                    <EditOnly notice>
                      <PrimaryButton type="submit" disabled={loading || !name || !hasAnyField} style={{ width: 'auto', padding: '12px 40px' }}>
                        {loading ? (isEditMode ? t.saving : t.creating) : (isEditMode ? t.save : t.create)}
                      </PrimaryButton>
                    </EditOnly>
                  </StepNav>
                </SectionCardWide>
              </>
            )}
          </Form>
        </AdminCardForm>
      </AdminContent>

      {splitEditorIndex !== null && (() => {
        const target = selectedItems[splitEditorIndex];
        if (!target || target.itemType !== 'station' || target.subType !== 'collage') return null;
        const limit = getCollageLimit(target.settings);
        // Source photo labels — prefer the missions array, else generic names.
        const settings = target.settings ?? {};
        const rawMissions = (settings as { missions?: { title?: string; description?: string }[] }).missions;
        const photoLabels = Array.isArray(rawMissions) && rawMissions.length > 0
          ? rawMissions.map((m, i) => ({ title: m?.title?.trim() || `${t.photoLabel} ${i + 1}`, description: m?.description }))
          : Array.from({ length: limit }, (_, i) => ({ title: `${t.photoLabel} ${i + 1}` }));
        // Reorder by existing photoOrder if set, so the popup shows current order.
        const existingOrder = target.collageSplit?.photoOrder;
        const orderedLabels = existingOrder && existingOrder.length === photoLabels.length
          ? existingOrder.map((idx) => photoLabels[idx] ?? { title: `${t.photoLabel} ${idx + 1}` })
          : photoLabels;
        const initialPartSizes = target.collageSplit?.partSizes && target.collageSplit.partSizes.length > 0
          ? target.collageSplit.partSizes
          : [limit];
        const initialVideoPartIndex = target.collageSplit?.videoPartIndex ?? null;
        return (
          <CollageSplitEditor
            stationName={target.name}
            photos={orderedLabels}
            initialPartSizes={initialPartSizes}
            initialVideoPartIndex={initialVideoPartIndex}
            onCancel={() => setSplitEditorIndex(null)}
            onSave={(res: SplitEditorResult) => {
              // Map the editor's "ordered-index" result back to original mission indices.
              const baseOrder = existingOrder && existingOrder.length === photoLabels.length
                ? existingOrder
                : photoLabels.map((_, i) => i);
              const remappedOrder = res.photoOrder.map((orderedIdx) => baseOrder[orderedIdx] ?? orderedIdx);
              applySplitEditorResult(splitEditorIndex, { ...res, photoOrder: remappedOrder });
            }}
            t={t}
          />
        );
      })()}

      {themePickerOpen && (
        <ThemePickerModal
          value={moduleTheme}
          options={themeOptions}
          canCreate={canEditContent}
          canManage={canManageTheme}
          onChange={setModuleTheme}
          onCreate={() => { setEditingTheme(null); setThemeModalOpen(true); }}
          onEdit={(ct) => { setEditingTheme(ct); setThemeModalOpen(true); }}
          onDelete={handleDeleteTheme}
          onClose={() => setThemePickerOpen(false)}
          t={t}
        />
      )}

      {themeModalOpen && (
        <ThemeFormModal
          existing={editingTheme}
          onSaved={(saved) => {
            setCustomThemes((prev) => {
              const idx = prev.findIndex((t) => t._id === saved._id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = saved;
                return next;
              }
              return [saved, ...prev];
            });
            setModuleTheme(saved._id);
            setThemeModalOpen(false);
            setEditingTheme(null);
          }}
          onClose={() => { setThemeModalOpen(false); setEditingTheme(null); }}
        />
      )}
    </AdminPage>
  );
}
