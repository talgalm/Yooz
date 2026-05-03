import { styled } from '@mui/material/styles';
import {
  Logo,
  AdminCard,
  OutlineButton,
  DangerButton,
  SelectionButton,
  BodyText,
  PrimaryButton,
  Input,
  Select,
  SelectionGroup,
  MobileCardItem,
  PRIMARY,
  BORDER,
} from '../../components/styled';

// ─── Admin Logo (reused on every admin/manager page) ───

export const AdminLogo = styled(Logo)({
  fontSize: 28,
  margin: 0,
});

// ─── Section Layout ───

export const SectionHeaderRow = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: 24,
});

export const SectionSubHeaderRow = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: 12,
});

export const PageTitle = styled('h2')({
  margin: '0 0 24px',
});

export const PageTitleNoMargin = styled('h2')({
  margin: 0,
});

export const SectionTitle = styled('h3')({
  margin: '0 0 12px',
});

// ─── Form Labels ───

export const SectionLabel = styled(BodyText)({
  marginBottom: 8,
  fontWeight: 600,
  color: '#333',
});

export const SectionLabelNoMargin = styled(BodyText)({
  fontWeight: 600,
  color: '#333',
});

export const SectionLabelSmall = styled(BodyText)({
  marginBottom: 4,
  fontWeight: 600,
  color: '#333',
});

export const SectionDescription = styled(BodyText)({
  marginBottom: 8,
  fontSize: 12,
  color: '#888',
});

export const SubLabel = styled(BodyText)({
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: '#555',
});

export const TinyLabel = styled(BodyText)({
  fontSize: 11,
  color: '#aaa',
});

// ─── Selection Button Sub-descriptions ───

export const SelectionSubtext = styled('div')({
  fontSize: 12,
  fontWeight: 400,
  marginTop: 4,
  opacity: 0.7,
});

export const SelectionSubtextSmall = styled('div')({
  fontSize: 11,
  fontWeight: 400,
  marginTop: 2,
  opacity: 0.6,
});

// ─── Item Panel (used for rounds, questions, statements, popups, etc.) ───

export const ItemPanel = styled('div')({
  border: '1px solid #e8e8ec',
  borderRadius: 10,
  padding: 16,
  marginBottom: 12,
  background: '#fafafa',
});

export const ItemPanelHeader = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
});

export const ItemPanelTitle = styled(BodyText)({
  fontWeight: 700,
  color: '#333',
  fontSize: 14,
});

// ─── Inline Row layouts ───

export const InlineRow = styled('div')({
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  flexWrap: 'wrap',
});

export const InlineRowWrap = styled('div')({
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  flexWrap: 'wrap',
});

export const InlineRowGap12 = styled('div')({
  display: 'flex',
  gap: 12,
  alignItems: 'center',
});

export const InlineRowGap4 = styled('div')({
  display: 'flex',
  gap: 4,
  flexWrap: 'wrap',
});

export const InlineRowGap6 = styled('div')({
  display: 'flex',
  gap: 6,
  alignItems: 'center',
  flexWrap: 'wrap',
});

export const InlineRowSpaced = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
});

export const MoveButtonGroup = styled('div')({
  display: 'flex',
  gap: 2,
});

// ─── Vertical Column layouts ───

export const VerticalStack = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

export const VerticalStackGap10 = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

export const VerticalStackGap12 = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
});

export const VerticalStackGap4 = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

// ─── Scoring Row ───

export const ScoringRow = styled('div')({
  display: 'flex',
  gap: 12,
  alignItems: 'center',
});

export const ScoringLabel = styled(BodyText)({
  fontSize: 13,
  minWidth: 120,
  flex: 1,
});

export const ScoringInput = styled(Input)({
  width: 100,
  padding: '8px 12px',
  fontSize: 14,
});

// ─── Button Variants ───

export const SmallDangerButton = styled(DangerButton)({
  padding: '10px 24px',
  fontSize: 14,
  fontWeight: 700,
  borderRadius: 12,
});

export const TinyDangerButton = styled(DangerButton)({
  padding: '3px 10px',
  fontSize: 11,
});

export const SmallOutlineButton = styled(OutlineButton)({
  padding: '6px 14px',
  fontSize: 13,
});

export const TinyOutlineButton = styled(OutlineButton)({
  padding: '2px 6px',
  fontSize: 11,
});

export const RemoveOutlineButton = styled(OutlineButton)({
  padding: '2px 8px',
  fontSize: 11,
  color: '#e74c3c',
  borderColor: '#e74c3c',
});

export const ToggleButton = styled(SelectionButton)({
  flex: 'none',
  padding: '4px 14px',
  fontSize: 12,
});

export const ScoringToggleButton = styled(SelectionButton)({
  flex: 'none',
  padding: '6px 16px',
  fontSize: 13,
});

export const SmallActionButton = styled(PrimaryButton)({
  width: 'auto',
  padding: '10px 24px',
  fontSize: 14,
});

export const EditActionButton = styled(PrimaryButton)({
  width: 'auto',
  padding: '10px 20px',
  fontSize: 14,
});

// ─── Selection Button Variants ───

export const TagSelectionButton = styled(SelectionButton)({
  flex: 'none',
  padding: '8px 16px',
});

export const SmallSelectionButton = styled(SelectionButton)({
  flex: 'none',
  padding: '6px 12px',
  fontSize: 12,
});

// ─── Answer Card (correct/incorrect border) ───

export const AnswerPanel = styled('div')<{ correct?: boolean }>(({ correct }) => ({
  border: `1.5px solid ${correct ? '#28a745' : '#e74c3c'}`,
  borderRadius: 8,
  padding: 10,
  marginBottom: 8,
  background: correct ? '#f0fff4' : '#fff8f8',
}));

export const CorrectToggleButton = styled(SelectionButton)<{ correct?: boolean }>(({ correct }) => ({
  flex: 'none',
  padding: '6px 12px',
  fontSize: 12,
  border: `2px solid ${correct ? '#28a745' : BORDER}`,
  background: correct ? '#d4edda' : '#fff',
  color: correct ? '#155724' : '#888',
}));

export const AnswerPill = styled('button')<{ active?: boolean; variant: 'correct' | 'incorrect' }>(({ active, variant }) => {
  const isCorrect = variant === 'correct';
  return {
    flex: 'none',
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 20,
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: `2px solid ${active ? (isCorrect ? '#28a745' : '#e74c3c') : '#ccc'}`,
    background: active ? (isCorrect ? '#d4edda' : '#fde8e8') : '#f5f5f5',
    color: active ? (isCorrect ? '#155724' : '#721c24') : '#999',
  };
});

export const TruthToggleButton = styled(SelectionButton)<{ isTrue?: boolean }>(({ isTrue }) => ({
  flex: 'none',
  padding: '6px 16px',
  fontSize: 13,
  border: `2px solid ${isTrue ? '#28a745' : '#e74c3c'}`,
  background: isTrue ? '#d4edda' : '#fde8e8',
  color: isTrue ? '#155724' : '#721c24',
}));

// ─── Compact Inputs ───

export const CompactInput = styled(Input)({
  padding: '8px 10px',
  fontSize: 13,
});

export const TinyInput = styled(Input)({
  padding: '4px 8px',
  fontSize: 12,
});

export const FlexInput = styled(Input)({
  flex: 1,
});

// ─── Card Variants ───

export const AdminCardNoPadding = styled(AdminCard)({
  padding: 0,
});

export const AdminCardNarrow = styled(AdminCard)({
  maxWidth: 760,
});

export const AdminCardForm = styled(AdminCard)({
  maxWidth: 1240,
});

export const AdminCardWide = styled(AdminCard)({
  maxWidth: 1320,
});

export const AdminCardCentered = styled(AdminCard)({
  maxWidth: 400,
  margin: '40px auto',
});

export const FormCard = styled(AdminCard)({
  marginBottom: 24,
});

export const PageTopRow = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: 24,
});

export const DesktopFormGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)',
  gap: 24,
  alignItems: 'start',
  '@media (max-width: 1100px)': {
    gridTemplateColumns: '1fr',
  },
});

export const FormSectionCard = styled('section')({
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: 22,
  borderRadius: 18,
  border: '1px solid #ececf4',
  background: '#fafafe',
});

export const FormSectionCardWide = styled(FormSectionCard)({
  marginTop: 24,
});

// ─── Table Cell Styles ───

export const CellBold = styled('span')({
  fontWeight: 600,
});

export const CellMuted = styled('span')({
  color: '#888',
});

export const CellSmallMuted = styled('span')({
  color: '#888',
  fontSize: 12,
});

export const CellPrimary = styled('span')({
  fontWeight: 700,
  color: PRIMARY,
});

export const CellAlignEnd = styled('td')({
  textAlign: 'end',
});

// ─── Mobile Card Helpers ───

export const MobileCardHeader = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
});

export const MobileCardName = styled('span')({
  fontWeight: 700,
  fontSize: 15,
});

export const MobileCardNameLarge = styled('span')({
  fontWeight: 700,
  fontSize: 16,
});

export const MobileCardDetails = styled('div')({
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  flexWrap: 'wrap',
});

export const MobileCardDate = styled('span')({
  color: '#aaa',
  fontSize: 12,
  marginInlineStart: 'auto',
});

export const MobileCardItemDefault = styled(MobileCardItem)({
  cursor: 'default',
});

// ─── Detail Row (ViewActivity) ───

export const DetailRow = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '12px 0',
  borderBottom: '1px solid #f0f0f0',
  gap: 12,
  flexWrap: 'wrap',
});

export const DetailLabel = styled(BodyText)({
  fontWeight: 600,
  color: '#333',
  whiteSpace: 'nowrap',
});

export const DetailValue = styled('div')({
  textAlign: 'end',
});

// ─── Play Link Section ───

export const PlayLinkSection = styled('div')({
  marginTop: 24,
  padding: 16,
  background: '#f9f9fb',
  borderRadius: 8,
});

export const PlayLinkUrl = styled('code')({
  flex: 1,
  fontSize: 13,
  wordBreak: 'break-all',
  minWidth: 0,
});

// ─── Misc ───

export const ActionRow = styled('div')({
  marginTop: 32,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
});

export const ModalTitle = styled('h3')({
  margin: '0 0 12px',
});

export const ModalActions = styled('div')({
  display: 'flex',
  gap: 12,
  justifyContent: 'center',
});

export const EmptyText = styled(BodyText)({
  textAlign: 'center',
  padding: 32,
});

export const SmallText = styled(BodyText)({
  fontSize: 13,
});

export const HeaderActionsRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
});

export const CounterDisplay = styled('span')({
  fontSize: 18,
  fontWeight: 600,
  minWidth: 24,
  textAlign: 'center',
});

export const CounterButton = styled(OutlineButton)({
  padding: '6px 14px',
  fontSize: 18,
});

export const IndexNumber = styled('span')({
  fontSize: 13,
  color: '#888',
  minWidth: 20,
});

export const IndexNumberSmall = styled('span')({
  fontSize: 12,
  color: '#aaa',
  minWidth: 20,
});

// ─── Loading Spinner ───

export const LoadingContainer = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 80,
});

export const LoadingCenter = styled('div')({
  textAlign: 'center',
});

export const Spinner = styled('div')({
  width: 36,
  height: 36,
  border: '3px solid #f0f0f0',
  borderTopColor: PRIMARY,
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  margin: '0 auto 16px',
});

export const SpinKeyframe = () => (
  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
);

// ─── Station Order Item ───

export const StationOrderItem = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  background: '#f9f9fb',
  borderRadius: 8,
  border: '1px solid #e8e8ec',
  flexWrap: 'wrap',
});

export const StationOrderName = styled('span')({
  flex: 1,
  fontWeight: 600,
  fontSize: 14,
});

export const StationOrderGames = styled('span')({
  fontSize: 11,
  color: '#aaa',
});

// ─── Popup Message Card ───

export const PopupCard = styled('div')<{ enabled?: boolean }>(({ enabled = true }) => ({
  padding: '12px 16px',
  background: enabled ? '#f9f9fb' : '#fafafa',
  borderRadius: 10,
  border: `1px solid ${enabled ? '#e8e8ec' : '#eee'}`,
  opacity: enabled ? 1 : 0.7,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}));

export const PopupLabel = styled('label')({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 12,
  color: '#888',
  cursor: 'pointer',
});

export const PopupTitleInput = styled(Input)({
  flex: 1,
  padding: '8px 10px',
  fontSize: 13,
  minWidth: 120,
});

export const PopupContentInput = styled(Input)({
  flex: 1,
  padding: '8px 10px',
  fontSize: 13,
});

export const PopupTinyDangerButton = styled(DangerButton)({
  padding: '4px 10px',
  fontSize: 11,
});

export const PopupFieldColumn = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  flex: 1,
  minWidth: 140,
});

export const PopupFieldColumnSmall = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 80,
});

export const PopupSelect = styled(Select)({
  padding: '8px 10px',
  fontSize: 13,
});

export const PopupNumberInput = styled(Input)({
  padding: '8px 10px',
  fontSize: 13,
  width: 70,
});

// ─── Grid Config Row (Puzzle) ───

export const GridConfigRow = styled('div')({
  display: 'flex',
  gap: 16,
  flexWrap: 'wrap',
});

export const GridConfigField = styled('div')({
  flex: 1,
  minWidth: 100,
});

export const GridConfigFieldWide = styled('div')({
  flex: 1,
  minWidth: 140,
});

// ─── Card Row (for cards within rounds) ───

export const CardItemRow = styled('div')({
  display: 'flex',
  gap: 6,
  alignItems: 'center',
  marginBottom: 6,
  flexWrap: 'wrap',
});

export const CardInput = styled(Input)({
  flex: 1,
  padding: '10px 12px',
  fontSize: 14,
});

export const AnswerInput = styled(Input)({
  flex: 1,
  padding: '8px 10px',
  fontSize: 13,
  minWidth: 120,
});

export const ExplanationInput = styled(Input)({
  padding: '6px 10px',
  fontSize: 12,
});

// ─── Badge Variants ───

export const BadgeSpaced = styled('span')({
  display: 'inline-block',
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 6,
  background: '#f0eefa',
  color: PRIMARY,
  marginInlineEnd: 4,
  marginBottom: 2,
});

export const ScoreBadge = styled('span')({
  display: 'inline-block',
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 6,
  background: '#f0eefa',
  color: PRIMARY,
});

// ─── Participant Info ───

export const ParticipantName = styled('div')({
  fontWeight: 600,
});

export const ParticipantMeta = styled('div')({
  fontSize: 12,
  color: '#888',
});

export const ScoresWrap = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
});

export const JoinedDate = styled('td')({
  color: '#888',
  fontSize: 13,
});

// ─── Overflow container ───

export const OverflowWrapper = styled('div')({
  overflowX: 'auto',
});

// ─── Section Info Block ───

export const SectionInfoBlock = styled('div')({
  marginBottom: 24,
});

export const SmallMutedText = styled(BodyText)({
  color: '#888',
  fontSize: 13,
});

// ─── Image ───

export const PuzzlePreview = styled('div')({
  marginTop: 8,
  textAlign: 'center',
});

export const PuzzlePreviewImage = styled('img')({
  maxWidth: '100%',
  maxHeight: 200,
  borderRadius: 8,
  objectFit: 'contain',
});

// ─── Centered text (login page, etc.) ───

export const CenteredTitle = styled('h2')({
  margin: '0 0 8px',
  textAlign: 'center',
});

export const CenteredSubtitle = styled(BodyText)({
  textAlign: 'center',
  marginBottom: 24,
  color: '#888',
});

// ─── Opening Overlay (PlayPage) ───

export const OpeningOverlay = styled('div')<{ fading?: boolean }>(({ fading }) => ({
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  background: '#000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  overflow: 'hidden',
  touchAction: 'none',
  opacity: fading ? 0 : 1,
  transform: fading ? 'scale(1.1)' : 'scale(1)',
  transition: 'opacity 1.2s ease-out, transform 1.2s ease-out',
}));

export const OpeningMedia = styled('video')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const OpeningImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const SkipHint = styled('div')({
  position: 'absolute',
  bottom: 32,
  left: '50%',
  transform: 'translateX(-50%)',
  color: 'rgba(255,255,255,0.6)',
  fontSize: 13,
  fontWeight: 500,
  textShadow: '0 1px 4px rgba(0,0,0,0.5)',
  pointerEvents: 'none',
  animation: 'fadeInUp 1s ease-out 1.5s both',
});

export const UnmuteButton = styled('button')({
  position: 'absolute',
  top: 24,
  right: 24,
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.3)',
  background: 'rgba(0,0,0,0.55)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
  animation: 'fadeInUp 0.6s ease-out 0.3s both',
  '&:hover': {
    background: 'rgba(0,0,0,0.7)',
  },
});

export const LoginFadeIn = styled('div')<{ visible?: boolean }>(({ visible }) => ({
  opacity: visible ? 1 : 0,
  transform: visible ? 'translateY(0)' : 'translateY(20px)',
  transition: 'opacity 0.8s ease-out 0.1s, transform 0.8s ease-out 0.1s',
}));

// ─── Default Splash (PlayPage — no opening media) ───

export const DefaultSplashOverlay = styled('div')<{ fading?: boolean }>(({ fading }) => ({
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  background: '#8B2FC9',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  touchAction: 'none',
  opacity: fading ? 0 : 1,
  transform: fading ? 'scale(1.05)' : 'scale(1)',
  transition: 'opacity 1.2s ease-out, transform 1.2s ease-out',
}));

export const SplashLogo = styled('img')({
  width: 220,
  maxWidth: '60%',
  objectFit: 'contain',
  userSelect: 'none',
  pointerEvents: 'none',
});

// ─── Purple Login Page ───

export const PurpleLoginPage = styled('div')<{ visible?: boolean }>(({ visible }) => ({
  position: 'fixed',
  inset: 0,
  background: '#8B2FC9',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 24px',
  boxSizing: 'border-box',
  zIndex: 10,
  overflow: 'auto',
  pointerEvents: visible ? 'auto' : 'none',
  '& > *': {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(16px)',
    transition: 'opacity 0.8s ease-out 0.1s, transform 0.8s ease-out 0.1s',
  },
}));

export const LoginLogo = styled('img')({
  width: 140,
  maxWidth: '40%',
  objectFit: 'contain',
  marginBottom: 32,
});

export const LoginHeading = styled('h1')({
  fontSize: 32,
  fontWeight: 800,
  color: '#fff',
  margin: '0 0 8px',
  textAlign: 'center',
});

export const LoginSubheading = styled('p')({
  fontSize: 16,
  fontWeight: 500,
  color: 'rgba(255,255,255,0.8)',
  margin: '0 0 32px',
  textAlign: 'center',
});

export const LoginFormWrapper = styled('div')({
  width: '100%',
  maxWidth: 400,
});

export const HelpLink = styled('a')({
  color: 'rgba(255,255,255,0.8)',
  fontSize: 14,
  fontWeight: 500,
  textDecoration: 'underline',
  cursor: 'pointer',
  alignSelf: 'flex-end',
  textAlign: 'end',
  '&:hover': {
    color: '#fff',
  },
});

// ─── Group Text (HomePage) ───

export const GroupText = styled(BodyText)({
  marginBottom: 8,
  fontWeight: 600,
});

// ─── Code display ───

export const CodeDisplay = styled('code')({
  fontSize: 16,
});

export const CodeDisplaySmall = styled('code')({
  fontSize: 12,
  wordBreak: 'break-all',
});

export const MobileCardCode = styled('code')({
  fontSize: 13,
  color: '#666',
});

// ─── MobileCardItem name row ───

export const MobileCardNameRow = styled('div')({
  fontWeight: 700,
  fontSize: 15,
  marginBottom: 4,
});

export const MobileCardRow = styled('div')({
  display: 'flex',
  gap: 8,
  alignItems: 'center',
});

// ─── Hidden file input ───

export const HiddenInput = styled('input')({
  display: 'none',
});

// ─── Full-width Input ───

export const FullWidthInput = styled(Input)({
  width: '100%',
});

// ─── Buttons row for form ───

export const FormButtonsRow = styled('div')({
  display: 'flex',
  gap: 8,
});

// ─── Input with bottom margin ───

export const InputMb8 = styled(Input)({
  marginBottom: 8,
});

export const InputMb10 = styled(Input)({
  marginBottom: 10,
});

// ─── Small add button with top margin ───

export const AddButton = styled(OutlineButton)({
  padding: '4px 12px',
  fontSize: 12,
  marginTop: 4,
});

export const AddButtonMt8 = styled(OutlineButton)({
  padding: '6px 14px',
  fontSize: 13,
  marginTop: 8,
});

// ─── Selection group with wrap ───

export const SelectionGroupWrap = styled(SelectionGroup)({
  flexWrap: 'wrap',
});

export const SelectionGroupNoFlex = styled(SelectionGroup)({
  flex: 'none',
});

// ─── Detail Value Styles ───

export const BoldSpan = styled('span')({
  fontWeight: 600,
});

// ─── Status Toggle Button (ViewActivity) ───

export const StatusToggleButton = styled(OutlineButton)({
  padding: '4px 12px',
  fontSize: 12,
});

// ─── Modal Body Text ───

export const ModalBodyText = styled(BodyText)({
  marginBottom: 24,
});

// ─── Search Results (ModuleItemsSection) ───

export const SearchResultsList = styled('div')({
  border: '1px solid #e8e8ec',
  borderRadius: 8,
  maxHeight: 240,
  overflowY: 'auto',
  marginBottom: 12,
});

export const SearchResultGroup = styled('div')({
  padding: '8px 12px 4px',
  fontSize: 11,
  fontWeight: 700,
  color: '#aaa',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
});

export const SearchResultItem = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  cursor: 'pointer',
  '&:hover': { background: '#f5f5f8' },
});

export const ItemTypeBadge = styled('span')<{ itemType: 'game' | 'station' }>(({ itemType }) => ({
  display: 'inline-block',
  padding: '2px 8px',
  fontSize: 10,
  fontWeight: 700,
  borderRadius: 4,
  background: itemType === 'game' ? '#e8f5e9' : '#e3f2fd',
  color: itemType === 'game' ? '#2e7d32' : '#1565c0',
  textTransform: 'uppercase',
}));

export const RemoveItemButton = styled('button')({
  background: 'none',
  border: 'none',
  color: '#c62828',
  cursor: 'pointer',
  fontSize: 16,
  padding: '2px 6px',
  borderRadius: 4,
  '&:hover': { background: '#ffebee' },
});

// ─── Role Badge (Users tab) ───

export const RoleBadge = styled('span')<{ role: 'viewer' | 'admin' | 'super_admin' | 'customer' }>(({ role }) => ({
  display: 'inline-block',
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 6,
  background:
    role === 'super_admin' ? '#fde8e8'
      : role === 'admin' ? '#e8f5e9'
        : role === 'customer' ? '#fff8e1'
          : '#f0eefa',
  color:
    role === 'super_admin' ? '#c0392b'
      : role === 'admin' ? '#2e7d32'
        : role === 'customer' ? '#e65100'
          : PRIMARY,
}));
