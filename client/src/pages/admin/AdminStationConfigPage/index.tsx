import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminStationConfigPage.i18n';
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
  SelectionButton,
  SelectionGroup,
} from '../../../components/styled';
import {
  AdminCardWide,
  PageTitle,
  PageTopRow,
  DesktopFormGrid,
  FormSectionCard,
  FormSectionCardWide,
  SectionLabel,
  SectionLabelNoMargin,
  SmallOutlineButton,
  ToggleButton,
  InlineRow,
  InlineRowGap12,
  FlexInput,
  VerticalStack,
  SelectionSubtextSmall,
} from '../styled';

type StationTypeOption = 'text' | 'video' | 'image' | 'narrative' | 'badge' | 'collage' | 'feedback' | 'riddle';

interface StationData {
  _id: string;
  name: string;
  type: StationTypeOption;
  description?: string;
  customer?: string;
  theme?: string;
  tags?: string[];
  settings: Record<string, unknown>;
}

const HintToggleRow = styled(InlineRowGap12)({
  marginBottom: 8,
});

const RandomButton = styled('button')({
  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  padding: '8px 18px',
  borderRadius: 8,
  border: '2px solid #b45309',
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 2px 0 #92400e',
  transition: 'all 0.1s ease',
  '&:active': { transform: 'translateY(2px)', boxShadow: 'none' },
});

export default function AdminStationConfigPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const t = useTranslations(texts);

  const creatableTypes: StationTypeOption[] = ['text', 'video', 'image', 'collage', 'feedback', 'riddle'];
  const stationTypesWithoutHint: StationTypeOption[] = ['text', 'video', 'image', 'feedback'];
  const typeFromUrl = searchParams.get('type') as StationTypeOption | null;
  const defaultType: StationTypeOption =
    typeFromUrl && creatableTypes.includes(typeFromUrl) ? typeFromUrl : 'text';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customer, setCustomer] = useState('');
  const [theme, setTheme] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [stationType, setStationType] = useState<StationTypeOption>(defaultType);

  // Hint
  const [hintEnabled, setHintEnabled] = useState(false);
  const [hintText, setHintText] = useState('');

  // Text station
  const [textContent, setTextContent] = useState('');
  // Video/Image station
  const [mediaUrl, setMediaUrl] = useState('');
  const [descPosition, setDescPosition] = useState<'before' | 'after'>('before');
  // Narrative station
  const [narrativeTitle, setNarrativeTitle] = useState('');
  const [narrativeBody, setNarrativeBody] = useState('');
  const [narrativeButtonText, setNarrativeButtonText] = useState('');
  const [narrativeBgImage, setNarrativeBgImage] = useState('');
  // Badge station
  const [badgeTitle, setBadgeTitle] = useState('');
  const [badgeSubtitle, setBadgeSubtitle] = useState('');
  const [badgeImageUrl, setBadgeImageUrl] = useState('');
  // Collage station
  const [collageHeader, setCollageHeader] = useState('');
  const [collageDescription, setCollageDescription] = useState('');
  const [collageMissions, setCollageMissions] = useState<{ title: string; description: string }[]>([
    { title: '', description: '' },
  ]);
  // Feedback station
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackIntroText, setFeedbackIntroText] = useState('');
  const [feedbackQuestions, setFeedbackQuestions] = useState<{ text: string }[]>([{ text: '' }]);
  const [feedbackNotesEnabled, setFeedbackNotesEnabled] = useState(true);
  const [feedbackNotesPlaceholder, setFeedbackNotesPlaceholder] = useState('');
  // Riddle station
  const [riddleClue, setRiddleClue] = useState('');
  const [riddleAnswer, setRiddleAnswer] = useState('');
  const [riddleMediaUrl, setRiddleMediaUrl] = useState('');
  const [riddleMediaType, setRiddleMediaType] = useState<'image' | 'video'>('image');
  const [riddleMaxScore, setRiddleMaxScore] = useState('100');
  const [riddleSuccessMsg, setRiddleSuccessMsg] = useState('');
  const [riddleFailureMsg, setRiddleFailureMsg] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    adminApiFetch<{ station: StationData }>(`/api/admin/stations/${id}`)
      .then((data) => {
        const s = data.station;
        setName(s.name);
        setStationType(s.type || 'text');
        setDescription(s.description || '');
        setCustomer(s.customer || '');
        setTheme(s.theme || '');
        setTags(s.tags || []);

        const settings = s.settings || {};
        if (settings.hint && typeof settings.hint === 'object') {
          const h = settings.hint as Record<string, unknown>;
          setHintEnabled(!!h.enabled);
          setHintText((h.text as string) || '');
        }
        if (settings.content) setTextContent(settings.content as string);
        if (settings.mediaUrl) setMediaUrl(settings.mediaUrl as string);
        if (settings.title) setNarrativeTitle(settings.title as string);
        if (settings.bodyText) setNarrativeBody(settings.bodyText as string);
        if (settings.buttonText) setNarrativeButtonText(settings.buttonText as string);
        if (settings.backgroundImage) setNarrativeBgImage(settings.backgroundImage as string);
        if (s.type === 'badge') {
          if (settings.title) setBadgeTitle(settings.title as string);
          if (settings.subtitle) setBadgeSubtitle(settings.subtitle as string);
          if (settings.badgeImageUrl) setBadgeImageUrl(settings.badgeImageUrl as string);
        }
        if (s.type === 'collage') {
          if (settings.header) setCollageHeader(settings.header as string);
          if (settings.description) setCollageDescription(settings.description as string);
          if (Array.isArray(settings.missions) && (settings.missions as unknown[]).length > 0) {
            setCollageMissions(settings.missions as { title: string; description: string }[]);
          }
        }
        if (s.type === 'feedback') {
          if (settings.title) setFeedbackTitle(settings.title as string);
          if (settings.introText) setFeedbackIntroText(settings.introText as string);
          if (Array.isArray(settings.questions) && (settings.questions as unknown[]).length > 0) {
            setFeedbackQuestions(settings.questions as { text: string }[]);
          }
          setFeedbackNotesEnabled(settings.notesEnabled !== false);
          if (settings.notesPlaceholder) setFeedbackNotesPlaceholder(settings.notesPlaceholder as string);
        }
        if (s.type === 'riddle') {
          if (settings.clue) setRiddleClue(settings.clue as string);
          if (settings.answer) setRiddleAnswer(settings.answer as string);
          if (settings.mediaUrl) setRiddleMediaUrl(settings.mediaUrl as string);
          if (settings.mediaType) setRiddleMediaType(settings.mediaType as 'image' | 'video');
          if (typeof settings.maxScore === 'number') setRiddleMaxScore(String(settings.maxScore));
          if (settings.successMessage) setRiddleSuccessMsg(settings.successMessage as string);
          if (settings.failureMessage) setRiddleFailureMsg(settings.failureMessage as string);
        }
        setInitialLoading(false);
      })
      .catch(() => navigate('/admin/dashboard'));
  }, [id, navigate]);

  // Prefill from library item (export from Content Library)
  useEffect(() => {
    if (id) return; // only in create mode
    const lib = (location.state as { libraryItem?: { name: string; type: string; description?: string; customer?: string; tags?: string[]; settings?: Record<string, unknown> } })?.libraryItem;
    if (!lib) return;

    setName(lib.name || '');
    if (lib.type && creatableTypes.includes(lib.type as StationTypeOption)) {
      setStationType(lib.type as StationTypeOption);
    }
    setDescription(lib.description || '');
    setCustomer(lib.customer || '');
    setTags((lib.tags || []).filter(t => t !== 'imported'));

    const settings = lib.settings || {};
    if (settings.hint && typeof settings.hint === 'object') {
      const h = settings.hint as Record<string, unknown>;
      setHintEnabled(!!h.enabled);
      setHintText((h.text as string) || '');
    }
    if (settings.content) setTextContent(settings.content as string);
    if (settings.mediaUrl) setMediaUrl(settings.mediaUrl as string);
    if (settings.descPosition === 'after') setDescPosition('after');
    if (settings.title) setNarrativeTitle(settings.title as string);
    if (settings.bodyText) setNarrativeBody(settings.bodyText as string);
    if (settings.buttonText) setNarrativeButtonText(settings.buttonText as string);
    if (settings.backgroundImage) setNarrativeBgImage(settings.backgroundImage as string);
    if (lib.type === 'badge') {
      if (settings.title) setBadgeTitle(settings.title as string);
      if (settings.subtitle) setBadgeSubtitle(settings.subtitle as string);
      if (settings.badgeImageUrl) setBadgeImageUrl(settings.badgeImageUrl as string);
    }
    if (lib.type === 'collage') {
      if (settings.header) setCollageHeader(settings.header as string);
      if (settings.description) setCollageDescription(settings.description as string);
      if (Array.isArray(settings.missions) && (settings.missions as unknown[]).length > 0) {
        setCollageMissions(settings.missions as { title: string; description: string }[]);
      }
    }
    if (lib.type === 'feedback') {
      if (settings.title) setFeedbackTitle(settings.title as string);
      if (settings.introText) setFeedbackIntroText(settings.introText as string);
      if (Array.isArray(settings.questions) && (settings.questions as unknown[]).length > 0) {
        setFeedbackQuestions(settings.questions as { text: string }[]);
      }
      setFeedbackNotesEnabled(settings.notesEnabled !== false);
      if (settings.notesPlaceholder) setFeedbackNotesPlaceholder(settings.notesPlaceholder as string);
    }
    if (lib.type === 'riddle') {
      if (settings.clue) setRiddleClue(settings.clue as string);
      if (settings.answer) setRiddleAnswer(settings.answer as string);
      if (settings.mediaUrl) setRiddleMediaUrl(settings.mediaUrl as string);
      if (settings.mediaType) setRiddleMediaType(settings.mediaType as 'image' | 'video');
      if (typeof settings.maxScore === 'number') setRiddleMaxScore(String(settings.maxScore));
      if (settings.successMessage) setRiddleSuccessMsg(settings.successMessage as string);
      if (settings.failureMessage) setRiddleFailureMsg(settings.failureMessage as string);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const settings: Record<string, unknown> = {};
      const allowStationHint = !stationTypesWithoutHint.includes(stationType);
      if (allowStationHint && hintEnabled && hintText.trim()) {
        settings.hint = { enabled: true, text: hintText.trim() };
      }
      if (stationType === 'text') {
        settings.content = textContent.trim();
      }
      if (stationType === 'video' || stationType === 'image') {
        settings.mediaUrl = mediaUrl.trim();
        settings.descPosition = descPosition;
      }
      if (stationType === 'narrative') {
        settings.title = narrativeTitle.trim();
        settings.bodyText = narrativeBody.trim();
        if (narrativeButtonText.trim()) settings.buttonText = narrativeButtonText.trim();
        if (narrativeBgImage.trim()) settings.backgroundImage = narrativeBgImage.trim();
      }
      if (stationType === 'badge') {
        settings.title = badgeTitle.trim();
        settings.subtitle = badgeSubtitle.trim();
        settings.badgeImageUrl = badgeImageUrl.trim();
      }
      if (stationType === 'collage') {
        settings.header = collageHeader.trim();
        settings.description = collageDescription.trim();
        settings.missions = collageMissions
          .filter((m) => m.title.trim())
          .map((m) => ({ title: m.title.trim(), description: m.description.trim() }));
      }
      if (stationType === 'feedback') {
        settings.title = feedbackTitle.trim();
        settings.introText = feedbackIntroText.trim();
        settings.questions = feedbackQuestions
          .filter((q) => q.text.trim())
          .map((q) => ({ text: q.text.trim() }));
        settings.notesEnabled = feedbackNotesEnabled;
        settings.notesPlaceholder = feedbackNotesPlaceholder.trim() || undefined;
      }
      if (stationType === 'riddle') {
        settings.clue = riddleClue.trim();
        settings.answer = riddleAnswer.trim();
        if (riddleMediaUrl.trim()) {
          settings.mediaUrl = riddleMediaUrl.trim();
          settings.mediaType = riddleMediaType;
        }
        const parsedScore = parseInt(riddleMaxScore, 10);
        settings.maxScore = isNaN(parsedScore) || parsedScore <= 0 ? 100 : parsedScore;
        if (riddleSuccessMsg.trim()) settings.successMessage = riddleSuccessMsg.trim();
        if (riddleFailureMsg.trim()) settings.failureMessage = riddleFailureMsg.trim();
      }

      const payload = {
        name: name.trim(),
        type: stationType,
        description: description.trim() || undefined,
        customer: customer.trim() || undefined,
        theme: theme.trim() || undefined,
        tags,
        settings,
      };

      if (id) {
        await adminApiFetch(`/api/admin/stations/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await adminApiFetch('/api/admin/stations', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      navigate('/admin/dashboard?tab=activities');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const stationNames: Record<string, string> = {
    text: 'תחנת טקסט - טסט',
    video: 'תחנת וידאו - טסט',
    image: 'תחנת תמונה - טסט',
    collage: 'תחנת קולאז׳ - טסט',
    feedback: 'תחנת משוב - טסט',
    riddle: 'תחנת חידה - טסט',
  };

  const handleFillRandom = () => {
    const ts = Date.now().toString().slice(-4);
    const types: StationTypeOption[] = [...creatableTypes];
    const randomType = types[Math.floor(Math.random() * types.length)];
    setStationType(randomType);
    setName(`${stationNames[randomType]} #${ts}`);
    setDescription('תחנה לבדיקה');
    setCustomer('לקוח טסט');
    setTheme('נושא טסט');
    const supportsHint = !stationTypesWithoutHint.includes(randomType);
    setHintEnabled(supportsHint);
    setHintText(supportsHint ? 'זהו רמז לדוגמה' : '');
    setTextContent('');
    setMediaUrl('');
    setCollageHeader('');
    setCollageDescription('');
    setCollageMissions([{ title: '', description: '' }]);
    setFeedbackTitle('');
    setFeedbackIntroText('');
    setFeedbackQuestions([{ text: '' }]);
    setFeedbackNotesEnabled(true);
    setFeedbackNotesPlaceholder('');
    setRiddleClue('');
    setRiddleAnswer('');
    setRiddleMediaUrl('');
    setRiddleMediaType('image');
    setRiddleMaxScore('100');
    setRiddleSuccessMsg('');
    setRiddleFailureMsg('');
    if (randomType === 'text') {
      setTextContent('זהו תוכן טקסט לדוגמה עבור תחנת בדיקה. כאן יופיע המידע שהמשתתף צריך לקרוא.');
    } else if (randomType === 'video') {
      setMediaUrl('https://www.w3schools.com/html/mov_bbb.mp4');
    } else if (randomType === 'image') {
      setMediaUrl('https://picsum.photos/800/600');
    } else if (randomType === 'collage') {
      setCollageHeader('בואו ניצור יחד קולאז׳ חי');
      setCollageDescription('קחו בין תמונה אחת לשלוש לפי ההנחיות. אנחנו מחפשים רגעים אמיתיים.');
      setCollageMissions([
        { title: 'מעגל הצוות', description: 'צלמו את כל הצוות עומד במעגל ומביט אל המרכז.' },
        { title: 'אביזר מצחיק', description: 'צלמו תמונה עם חפץ אקראי ומצחיק שמצאתם בחדר.' },
        { title: 'קרני אצבעות', description: 'צרו זוגות ועשו עם האצבעות "קרניים" אחד אל השני עם חיוך.' },
      ]);
    } else if (randomType === 'feedback') {
      setFeedbackTitle('משוב על ההרצאה');
      setFeedbackIntroText('נשמח לשמוע את דעתכם על ההרצאה. דרגו כל שאלה בסולם 1-6.');
      setFeedbackQuestions([
        { text: 'באיזו מידה אתה שבע רצון מההרצאה (1-6)' },
        { text: 'באיזו מידה את/ה מעריך/ה כי תוכל/י ליישם חלק מהתוכן שהועבר בהרצאה' },
        { text: 'באיזו מידה ההרצאה תרמה לך מבחינה מקצועית' },
        { text: 'באיזו מידה המרצה הצליח/ה להעביר את התוכן בצורה ברורה' },
        { text: 'באיזו מידה הדוגמאות שהובאו היו רלוונטיות' },
        { text: 'באיזו מידה היית ממליץ/ה על ההרצאה לעמית/ה' },
      ]);
      setFeedbackNotesEnabled(true);
      setFeedbackNotesPlaceholder('עוד הערות?');
    } else if (randomType === 'riddle') {
      setRiddleClue('אני יש לי ידיים אבל אין לי אצבעות. אני מראה לך את הזמן. מה אני?');
      setRiddleAnswer('שעון');
      setRiddleMaxScore('100');
      setRiddleSuccessMsg('כל הכבוד! ניחשת נכון!');
      setRiddleFailureMsg('לא הצלחת הפעם. התשובה הייתה: שעון');
    }
  };

  if (initialLoading) return null;

  const showHintSection = !stationTypesWithoutHint.includes(stationType);

  return (
    <AdminPage>
      <AdminHeader>
        <img src="/images/logo-purple.png" alt="Yooz" style={{ height: 32 }} />
        <SmallOutlineButton onClick={() => navigate('/admin/dashboard')}>{t.back}</SmallOutlineButton>
      </AdminHeader>
      <AdminContent>
        <AdminCardWide>
          <PageTopRow>
            <PageTitle style={{ marginBottom: 0 }}>{t.title}</PageTitle>
            {!id && <RandomButton type="button" onClick={handleFillRandom}>🎲 Random</RandomButton>}
          </PageTopRow>
          <Form onSubmit={handleSubmit}>
            <DesktopFormGrid>
              <FormSectionCard>
                <Input
                  placeholder={t.stationName}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <div>
                  <SectionLabel>{t.stationType}</SectionLabel>
                  <SelectionGroup>
                    <SelectionButton type="button" selected={stationType === 'text'} onClick={() => setStationType('text')}>
                      <div>{t.typeText}</div>
                      <SelectionSubtextSmall>{t.typeTextDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                    <SelectionButton type="button" selected={stationType === 'video'} onClick={() => setStationType('video')}>
                      <div>{t.typeVideo}</div>
                      <SelectionSubtextSmall>{t.typeVideoDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                    <SelectionButton type="button" selected={stationType === 'image'} onClick={() => setStationType('image')}>
                      <div>{t.typeImage}</div>
                      <SelectionSubtextSmall>{t.typeImageDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                    {(stationType === 'narrative' || stationType === 'badge') && (
                      <SelectionButton type="button" selected disabled style={{ opacity: 0.85, cursor: 'default' }}>
                        <div>{stationType === 'narrative' ? t.typeNarrative : t.typeBadge}</div>
                        <SelectionSubtextSmall>{t.legacyStationType}</SelectionSubtextSmall>
                      </SelectionButton>
                    )}
                    <SelectionButton type="button" selected={stationType === 'collage'} onClick={() => setStationType('collage')}>
                      <div>{t.typeCollage}</div>
                      <SelectionSubtextSmall>{t.typeCollageDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                    <SelectionButton type="button" selected={stationType === 'feedback'} onClick={() => setStationType('feedback')}>
                      <div>{t.typeFeedback}</div>
                      <SelectionSubtextSmall>{t.typeFeedbackDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                    <SelectionButton type="button" selected={stationType === 'riddle'} onClick={() => setStationType('riddle')}>
                      <div>{t.typeRiddle}</div>
                      <SelectionSubtextSmall>{t.typeRiddleDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                  </SelectionGroup>
                </div>
                <Input
                  placeholder={t.description}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <Input
                  placeholder={t.customer}
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                />
                <Input
                  placeholder={t.theme}
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                />
                <div>
                  <SectionLabel>{t.tags || 'Tags'}</SectionLabel>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {tags.map((tag, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 20, background: '#f0eefa', color: '#6c5ce7' }}>
                        {tag}
                        <span style={{ cursor: 'pointer', marginInlineStart: 2 }} onClick={() => setTags(tags.filter((_, j) => j !== i))}>×</span>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Input
                      placeholder={t.addTag || 'Add tag...'}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const v = tagInput.trim();
                          if (v && !tags.includes(v)) setTags([...tags, v]);
                          setTagInput('');
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              </FormSectionCard>

              {showHintSection && (
                <FormSectionCard>
                  <div>
                    <HintToggleRow>
                      <SectionLabelNoMargin>{t.hintLabel}</SectionLabelNoMargin>
                      <ToggleButton
                        type="button"
                        selected={hintEnabled}
                        onClick={() => setHintEnabled((v) => !v)}
                      >
                        {hintEnabled ? 'ON' : 'OFF'}
                      </ToggleButton>
                    </HintToggleRow>
                    {hintEnabled && (
                      <Input
                        placeholder={t.hintPlaceholder}
                        value={hintText}
                        onChange={(e) => setHintText(e.target.value)}
                      />
                    )}
                  </div>
                </FormSectionCard>
              )}
            </DesktopFormGrid>

            {/* Type-specific settings */}
            <FormSectionCardWide>
              {stationType === 'text' && (
                <div>
                  <SectionLabel>{t.textContent}</SectionLabel>
                  <Input
                    placeholder={t.textContent}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                  />
                </div>
              )}

              {stationType === 'video' && (
                <VerticalStack>
                  <SectionLabelNoMargin>{t.mediaUrl}</SectionLabelNoMargin>
                  <InlineRow>
                    <FileUploadButton
                      accept="video/*"
                      onUploaded={(url) => setMediaUrl(url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <FlexInput
                      placeholder={t.mediaUrl}
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                    />
                  </InlineRow>
                  <SectionLabelNoMargin>{t.descPosition}</SectionLabelNoMargin>
                  <SelectionGroup>
                    <SelectionButton type="button" selected={descPosition === 'before'} onClick={() => setDescPosition('before')}>{t.descBefore}</SelectionButton>
                    <SelectionButton type="button" selected={descPosition === 'after'} onClick={() => setDescPosition('after')}>{t.descAfter}</SelectionButton>
                  </SelectionGroup>
                </VerticalStack>
              )}

              {stationType === 'image' && (
                <VerticalStack>
                  <SectionLabelNoMargin>{t.mediaUrl}</SectionLabelNoMargin>
                  <InlineRow>
                    <FileUploadButton
                      accept="image/*"
                      onUploaded={(url) => setMediaUrl(url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <FlexInput
                      placeholder={t.mediaUrl}
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                    />
                  </InlineRow>
                  <SectionLabelNoMargin>{t.descPosition}</SectionLabelNoMargin>
                  <SelectionGroup>
                    <SelectionButton type="button" selected={descPosition === 'before'} onClick={() => setDescPosition('before')}>{t.descBefore}</SelectionButton>
                    <SelectionButton type="button" selected={descPosition === 'after'} onClick={() => setDescPosition('after')}>{t.descAfter}</SelectionButton>
                  </SelectionGroup>
                </VerticalStack>
              )}

              {stationType === 'narrative' && (
                <VerticalStack>
                  <SectionLabelNoMargin>{t.narrativeTitle}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.narrativeTitle}
                    value={narrativeTitle}
                    onChange={(e) => setNarrativeTitle(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.narrativeBody}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.narrativeBody}
                    value={narrativeBody}
                    onChange={(e) => setNarrativeBody(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.narrativeButton}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.narrativeButton}
                    value={narrativeButtonText}
                    onChange={(e) => setNarrativeButtonText(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.narrativeBgImage}</SectionLabelNoMargin>
                  <InlineRow>
                    <FileUploadButton
                      accept="image/*"
                      onUploaded={(url) => setNarrativeBgImage(url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <FlexInput
                      placeholder={t.narrativeBgImage}
                      value={narrativeBgImage}
                      onChange={(e) => setNarrativeBgImage(e.target.value)}
                    />
                  </InlineRow>
                </VerticalStack>
              )}

              {stationType === 'badge' && (
                <VerticalStack>
                  <SectionLabelNoMargin>{t.badgeStationTitle}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.badgeStationTitle}
                    value={badgeTitle}
                    onChange={(e) => setBadgeTitle(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.badgeSubtitle}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.badgeSubtitle}
                    value={badgeSubtitle}
                    onChange={(e) => setBadgeSubtitle(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.badgeImage}</SectionLabelNoMargin>
                  <InlineRow>
                    <FileUploadButton
                      accept="image/*"
                      onUploaded={(url) => setBadgeImageUrl(url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <FlexInput
                      placeholder={t.badgeImage}
                      value={badgeImageUrl}
                      onChange={(e) => setBadgeImageUrl(e.target.value)}
                    />
                  </InlineRow>
                </VerticalStack>
              )}

              {stationType === 'collage' && (
                <VerticalStack>
                  <SectionLabelNoMargin>{t.collageHeader}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.collageHeaderPlaceholder}
                    value={collageHeader}
                    onChange={(e) => setCollageHeader(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.collageDescription}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.collageDescriptionPlaceholder}
                    value={collageDescription}
                    onChange={(e) => setCollageDescription(e.target.value)}
                  />

                  <SectionLabelNoMargin>{t.collageMissions}</SectionLabelNoMargin>
                  {collageMissions.map((mission, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <SectionLabelNoMargin style={{ margin: 0 }}>
                          {t.collageMissionNum} {idx + 1}
                        </SectionLabelNoMargin>
                        {collageMissions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setCollageMissions((ms) => ms.filter((_, i) => i !== idx))}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 13, padding: '2px 6px' }}
                          >
                            {t.collageMissionRemove}
                          </button>
                        )}
                      </div>
                      <Input
                        placeholder={t.collageMissionTitle}
                        value={mission.title}
                        onChange={(e) => setCollageMissions((ms) => ms.map((m, i) => i === idx ? { ...m, title: e.target.value } : m))}
                        style={{ marginBottom: 8 }}
                      />
                      <Input
                        placeholder={t.collageMissionDesc}
                        value={mission.description}
                        onChange={(e) => setCollageMissions((ms) => ms.map((m, i) => i === idx ? { ...m, description: e.target.value } : m))}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCollageMissions((ms) => [...ms, { title: '', description: '' }])}
                    style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#a5b4fc', fontSize: 13, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    + {t.collageMissionAdd}
                  </button>
                </VerticalStack>
              )}

              {/* Feedback config */}
              {stationType === 'feedback' && (
                <VerticalStack>
                  <SectionLabel>{t.feedbackTitle}</SectionLabel>
                  <Input
                    placeholder={t.feedbackTitlePlaceholder}
                    value={feedbackTitle}
                    onChange={(e) => setFeedbackTitle(e.target.value)}
                  />
                  <Input
                    placeholder={t.feedbackIntroPlaceholder}
                    value={feedbackIntroText}
                    onChange={(e) => setFeedbackIntroText(e.target.value)}
                  />

                  <SectionLabel>{t.feedbackQuestions}</SectionLabel>
                  {feedbackQuestions.map((q, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#999', minWidth: 24 }}>{t.feedbackQuestionNum} {i + 1}</span>
                      <Input
                        placeholder={t.feedbackQuestionText}
                        value={q.text}
                        onChange={(e) => {
                          const updated = [...feedbackQuestions];
                          updated[i] = { text: e.target.value };
                          setFeedbackQuestions(updated);
                        }}
                        style={{ flex: 1 }}
                      />
                      {feedbackQuestions.length > 1 && (
                        <SmallOutlineButton
                          type="button"
                          onClick={() => setFeedbackQuestions(feedbackQuestions.filter((_, j) => j !== i))}
                        >
                          {t.feedbackQuestionRemove}
                        </SmallOutlineButton>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFeedbackQuestions((qs) => [...qs, { text: '' }])}
                    style={{ background: '#6c5ce7', border: '1px solid #6c5ce7', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' }}
                  >
                    + {t.feedbackQuestionAdd}
                  </button>

                  <SectionLabel style={{ marginTop: 16 }}>{t.feedbackNotesEnabled}</SectionLabel>
                  <InlineRowGap12>
                    <ToggleButton
                      type="button"
                      selected={feedbackNotesEnabled}
                      onClick={() => setFeedbackNotesEnabled((v) => !v)}
                    >
                      {feedbackNotesEnabled ? 'ON' : 'OFF'}
                    </ToggleButton>
                  </InlineRowGap12>
                  {feedbackNotesEnabled && (
                    <Input
                      placeholder={t.feedbackNotesPlaceholderDefault}
                      value={feedbackNotesPlaceholder}
                      onChange={(e) => setFeedbackNotesPlaceholder(e.target.value)}
                    />
                  )}
                </VerticalStack>
              )}
              {/* Riddle config */}
              {stationType === 'riddle' && (
                <VerticalStack>
                  <SectionLabel>{t.riddleClue}</SectionLabel>
                  <Input
                    placeholder={t.riddleCluePlaceholder}
                    value={riddleClue}
                    onChange={(e) => setRiddleClue(e.target.value)}
                  />

                  <SectionLabel>{t.riddleAnswer}</SectionLabel>
                  <Input
                    placeholder={t.riddleAnswerPlaceholder}
                    value={riddleAnswer}
                    onChange={(e) => setRiddleAnswer(e.target.value)}
                  />
                  <span style={{ fontSize: 12, color: '#999', marginTop: -8 }}>{t.riddleAnswerHint}</span>

                  {riddleAnswer.trim() && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 0', direction: /[\u0590-\u05FF]/.test(riddleAnswer) ? 'rtl' : 'ltr' }}>
                      {riddleAnswer.trim().split(' ').map((word, wi) => (
                        <div key={wi} style={{ display: 'flex', gap: 4 }}>
                          {word.split('').map((ch, ci) => (
                            <div key={ci} style={{ width: 30, height: 36, border: '2px solid #6c5ce7', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, background: '#f0eefa', color: '#6c5ce7' }}>
                              {ch}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  <SectionLabel>{t.riddleMaxScore}</SectionLabel>
                  <Input
                    type="number"
                    placeholder={t.riddleMaxScorePlaceholder}
                    value={riddleMaxScore}
                    onChange={(e) => setRiddleMaxScore(e.target.value)}
                    style={{ maxWidth: 120 }}
                  />

                  <SectionLabel>{t.riddleMedia}</SectionLabel>
                  <SelectionGroup>
                    <SelectionButton type="button" selected={riddleMediaType === 'image'} onClick={() => setRiddleMediaType('image')}>{t.riddleMediaTypeImage}</SelectionButton>
                    <SelectionButton type="button" selected={riddleMediaType === 'video'} onClick={() => setRiddleMediaType('video')}>{t.riddleMediaTypeVideo}</SelectionButton>
                  </SelectionGroup>
                  <InlineRow>
                    <FileUploadButton
                      accept={riddleMediaType === 'image' ? 'image/*' : 'video/*'}
                      onUploaded={(url) => setRiddleMediaUrl(url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <FlexInput
                      placeholder={t.mediaUrl}
                      value={riddleMediaUrl}
                      onChange={(e) => setRiddleMediaUrl(e.target.value)}
                    />
                  </InlineRow>

                  <SectionLabel>{t.riddleSuccessMsg}</SectionLabel>
                  <Input
                    placeholder={t.riddleSuccessMsgPlaceholder}
                    value={riddleSuccessMsg}
                    onChange={(e) => setRiddleSuccessMsg(e.target.value)}
                  />

                  <SectionLabel>{t.riddleFailureMsg}</SectionLabel>
                  <Input
                    placeholder={t.riddleFailureMsgPlaceholder}
                    value={riddleFailureMsg}
                    onChange={(e) => setRiddleFailureMsg(e.target.value)}
                  />
                </VerticalStack>
              )}
            </FormSectionCardWide>

            <FormSectionCardWide>
              {error && <ErrorText>{error}</ErrorText>}
              <PrimaryButton type="submit" disabled={loading || !name.trim()}>
                {loading ? t.saving : t.save}
              </PrimaryButton>
            </FormSectionCardWide>
          </Form>
        </AdminCardWide>
      </AdminContent>
    </AdminPage>
  );
}
