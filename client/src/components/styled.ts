import { styled, keyframes } from '@mui/material/styles';

// ─── Colors ───
export const PRIMARY = '#6c5ce7';
export const PRIMARY_GREEN = '#27ae60';
export const PRIMARY_LIGHT = '#f0eefa';
export const PRIMARY_DISABLED = '#b8b0e8';
export const ERROR = '#e74c3c';
export const TEXT = '#333';
export const TEXT_LIGHT = '#888';
export const BORDER = '#e0e0e0';
export const BG_INPUT = '#fafafa';

// ─── Layout ───

export const PageContainer = styled('div')({
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
});

export const CenteredPage = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100dvh',
  padding: 24,
  position: 'relative',
});

const wave = keyframes`
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40% { transform: translateY(-16px); opacity: 1; }
`;

export const LoaderWave = styled('div')({
  display: 'flex',
  /** A Latin wordmark reads the same in every language - it never mirrors. */
  direction: 'ltr',
  gap: 6,
  fontSize: 48,
  fontWeight: 700,
  color: '#7c3aed',
  fontFamily: 'inherit',
  '& span': {
    display: 'inline-block',
    animation: `${wave} 1.2s infinite ease-in-out`,
  },
  '& span:nth-of-type(1)': {
    animationDelay: '0.1s',
  },
  '& span:nth-of-type(2)': {
    animationDelay: '0.2s',
  },
  '& span:nth-of-type(3)': {
    animationDelay: '0.3s',
  },
  '& span:nth-of-type(4)': {
    animationDelay: '0.4s',
  },
});

export const Card = styled('div')({
  width: '100%',
  maxWidth: 400,
  textAlign: 'center',
});

export const HeaderBar = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'nowrap',
  gap: 12,
  padding: '16px 20px',
  borderBottom: '1px solid #f0f0f0',
  '@media (min-width: 768px)': {
    padding: '16px max(20px, calc((100% - 760px) / 2))',
  },
});

export const HeaderActions = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  flexWrap: 'nowrap',
  gap: 8,
});

// ─── Form ───

export const Form = styled('form')({
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
});

export const Input = styled('input')({
  width: '100%',
  padding: '14px 16px',
  fontSize: 16,
  border: `2px solid ${BORDER}`,
  borderRadius: 12,
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
  background: BG_INPUT,
  textAlign: 'start',
  fontFamily: 'inherit',
  '&:focus': {
    borderColor: PRIMARY,
    background: '#fff',
  },
  '&::placeholder': {
    color: '#bbb',
  },
});

// ─── Buttons ───

export const PrimaryButton = styled('button')({
  width: '100%',
  padding: 14,
  fontSize: 18,
  fontWeight: 700,
  color: '#fff',
  background: PRIMARY,
  border: 'none',
  borderRadius: 12,
  cursor: 'pointer',
  transition: 'background 0.2s, transform 0.1s',
  fontFamily: 'inherit',
  textAlign: 'center',
  unicodeBidi: 'plaintext',
  '&:active': {
    transform: 'scale(0.98)',
  },
  '&:disabled': {
    background: PRIMARY_DISABLED,
    cursor: 'not-allowed',
  },
});

export const OutlineButton = styled('button')({
  padding: '8px 16px',
  fontSize: 14,
  fontWeight: 600,
  color: TEXT_LIGHT,
  background: 'none',
  border: '1px solid #ddd',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:active': {
    background: '#f5f5f5',
  },
});

export const IconButton = styled('button')({
  padding: 6,
  fontSize: 20,
  background: 'none',
  border: `1.5px solid ${BORDER}`,
  borderRadius: 8,
  cursor: 'pointer',
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:active': {
    background: '#f5f5f5',
  },
});

/** Uniform 36×36 touch target for sticky headers (help, exit, mute, leaderboard, …). */
export const HeaderActionIconButton = styled('button')({
  width: 36,
  height: 36,
  minWidth: 36,
  margin: 0,
  padding: 0,
  boxSizing: 'border-box',
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontFamily: 'inherit',
  lineHeight: 1,
  flexShrink: 0,
  appearance: 'none',
  WebkitTapHighlightColor: 'transparent',
});

/** Single dark-header style: same border, fill, and hover for help / exit / mute / trophy / hint. */
export const DarkHeaderActionIconButton = styled(HeaderActionIconButton, {
  shouldForwardProp: (prop) => prop !== 'iconColor',
})<{ iconColor?: string }>(({ iconColor }) => ({
  color: iconColor ?? '#fff',
  border: '1px solid rgba(255,255,255,0.45)',
  background: 'rgba(255,255,255,0.08)',
  fontSize: 18,
  fontWeight: 700,
  transition: 'background 0.15s ease',
  '&:hover': {
    background: 'rgba(255,255,255,0.14)',
  },
  '&:active': {
    background: 'rgba(255,255,255,0.2)',
  },
}));

/**
 * Puzzle session header: **dark icons** on light pill, black outline (mint/light bg).
 *
 * Filters `iconColor` like its sibling above: callers pass the same props to
 * either variant, and without this the prop reached the DOM and React logged
 * "does not recognize the `iconColor` prop on a DOM element".
 */
export const PuzzleDarkHeaderActionIconButton = styled(HeaderActionIconButton, {
  shouldForwardProp: (prop) => prop !== 'iconColor',
})<{ iconColor?: string }>({
  color: '#1a1a1a',
  border: '1px solid rgba(0,0,0,0.45)',
  background: 'rgba(255,255,255,0.92)',
  fontSize: 18,
  fontWeight: 700,
  transition: 'background 0.15s ease, border-color 0.15s ease',
  '&:hover': {
    background: '#ffffff',
    borderColor: 'rgba(0,0,0,0.55)',
  },
  '&:active': {
    background: 'rgba(255,255,255,0.88)',
    borderColor: 'rgba(0,0,0,0.65)',
  },
});

/** Text control — matches puzzle icon pills. */
export const PuzzleDarkHeaderTextButton = styled('button')({
  margin: 0,
  minHeight: 36,
  height: 36,
  padding: '0 12px',
  boxSizing: 'border-box',
  borderRadius: 10,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.2,
  color: '#1a1a1a',
  border: '1px solid rgba(0,0,0,0.45)',
  background: 'rgba(255,255,255,0.92)',
  transition: 'background 0.15s ease, border-color 0.15s ease',
  appearance: 'none',
  WebkitTapHighlightColor: 'transparent',
  '&:hover': {
    background: '#ffffff',
    borderColor: 'rgba(0,0,0,0.55)',
  },
  '&:active': {
    background: 'rgba(255,255,255,0.88)',
    borderColor: 'rgba(0,0,0,0.65)',
  },
});

/** Text action on the same dark header row — matches `DarkHeaderActionIconButton` border and height. */
export const DarkHeaderTextButton = styled('button')({
  margin: 0,
  minHeight: 36,
  height: 36,
  padding: '0 12px',
  boxSizing: 'border-box',
  borderRadius: 10,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.2,
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.45)',
  background: 'rgba(255,255,255,0.08)',
  transition: 'background 0.15s ease',
  appearance: 'none',
  WebkitTapHighlightColor: 'transparent',
  '&:hover': {
    background: 'rgba(255,255,255,0.14)',
  },
  '&:active': {
    background: 'rgba(255,255,255,0.2)',
  },
});

// ─── Typography ───

export const Logo = styled('h1')({
  fontSize: 48,
  fontWeight: 800,
  color: PRIMARY,
  margin: '0 0 8px',
  letterSpacing: -1,
});

export const Subtitle = styled('p')({
  color: TEXT_LIGHT,
  fontSize: 16,
  margin: '0 0 32px',
});

export const ErrorText = styled('p')({
  color: ERROR,
  fontSize: 14,
  margin: 0,
});

export const Title = styled('h1')({
  fontSize: 28,
  fontWeight: 800,
  margin: '0 0 12px',
  color: TEXT,
});

export const BodyText = styled('p')({
  fontSize: 16,
  color: TEXT_LIGHT,
  margin: 0,
});

export const AccentText = styled('span')({
  fontWeight: 700,
  fontSize: 16,
  color: PRIMARY,
});

// ─── Admin Layout ───

export const AdminPage = styled('div')({
  minHeight: '100vh',
  background: '#f5f5f7',
  overflowX: 'hidden',
});

export const AdminHeader = styled('header')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '18px clamp(20px, 3vw, 40px)',
  background: '#fff',
  borderBottom: `1px solid ${BORDER}`,
  '@media (max-width: 600px)': {
    padding: '12px 16px',
  },
});

export const AdminContent = styled('main')({
  width: '100%',
  maxWidth: 1480,
  margin: '0 auto',
  padding: '40px clamp(20px, 3vw, 40px) 48px',
  boxSizing: 'border-box',
  minWidth: 0,
  '& h2': {
    fontSize: 20,
    fontWeight: 800,
    color: '#241f38',
    letterSpacing: '-0.01em',
  },
  '& h3': {
    fontSize: 15.5,
    fontWeight: 700,
    color: '#3a3352',
  },
  '@media (max-width: 960px)': {
    padding: '28px 20px 36px',
  },
  '@media (max-width: 600px)': {
    padding: '16px 12px',
  },
});

export const AdminCard = styled('div')({
  width: '100%',
  background: '#fff',
  border: '1px solid #ecebf4',
  borderRadius: 16,
  padding: 24,
  boxShadow: '0 1px 2px rgba(16,12,40,0.04), 0 10px 30px rgba(16,12,40,0.05)',
  boxSizing: 'border-box',
  minWidth: 0,
  '@media (max-width: 600px)': {
    borderRadius: 14,
    padding: 16,
  },
});

export const Table = styled('table')({
  width: '100%',
  borderCollapse: 'collapse',
  '& th, & td': {
    textAlign: 'start',
    padding: '13px 18px',
  },
  '& th': {
    fontWeight: 600,
    color: '#8d86a3',
    fontSize: 12.5,
    letterSpacing: 0.2,
    whiteSpace: 'nowrap',
    background: '#faf9fd',
    borderBottom: '1px solid #eeecf5',
  },
  '& td': {
    fontSize: 14,
    color: TEXT,
    borderBottom: '1px solid #f4f2f9',
  },
  '& tbody tr': {
    transition: 'background 0.15s',
  },
  '& tbody tr:hover': {
    background: '#faf8fe',
    cursor: 'pointer',
  },
  '& tbody tr:last-child td': {
    borderBottom: 'none',
  },
  '@media (max-width: 600px)': {
    '& th, & td': {
      padding: '10px 12px',
      fontSize: 13,
    },
  },
});

// ─── Selection Group ───

export const SelectionGroup = styled('div')({
  display: 'flex',
  gap: 8,
  '@media (max-width: 600px)': {
    flexWrap: 'wrap',
  },
});

export const SelectionButton = styled('button')<{ selected?: boolean }>(({ selected }) => ({
  flex: 1,
  padding: '12px 16px',
  fontSize: 14,
  fontWeight: 600,
  border: `2px solid ${selected ? PRIMARY : BORDER}`,
  borderRadius: 12,
  background: selected ? PRIMARY_LIGHT : '#fff',
  color: selected ? PRIMARY : TEXT,
  cursor: 'pointer',
  transition: 'all 0.2s',
  fontFamily: 'inherit',
}));

export const Select = styled('select')({
  width: '100%',
  padding: '14px 16px',
  fontSize: 16,
  border: `2px solid ${BORDER}`,
  borderRadius: 12,
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
  background: BG_INPUT,
  fontFamily: 'inherit',
  cursor: 'pointer',
  '&:focus': {
    borderColor: PRIMARY,
    background: '#fff',
  },
});

export const Badge = styled('span')({
  display: 'inline-block',
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 6,
  background: PRIMARY_LIGHT,
  color: PRIMARY,
});

export const CopyButton = styled('button')({
  padding: '8px 16px',
  fontSize: 14,
  fontWeight: 600,
  color: PRIMARY,
  background: PRIMARY_LIGHT,
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 0.2s',
  '&:active': {
    background: '#e0ddf5',
  },
});

export const DangerButton = styled('button', {
  shouldForwardProp: (prop) => prop !== 'confirm',
})<{ confirm?: boolean }>(({ confirm }) => ({
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 600,
  color: '#fff',
  background: confirm ? '#111' : ERROR,
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 0.15s ease',
  '&:active': {
    background: confirm ? '#000' : '#c0392b',
  },
}));

export const ConfirmButton = styled('button')({
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 600,
  color: '#fff',
  background: PRIMARY_GREEN,
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:active': {
    background: '#27ae60',
  },
});


// ─── Tabs ───

export const TabBar = styled('div')({
  display: 'flex',
  gap: 0,
  borderBottom: `3px solid ${BORDER}`,
  marginBottom: 28,
});

export const Tab = styled('button')<{ active?: boolean }>(({ active }) => ({
  flex: 1,
  padding: '16px 24px',
  fontSize: 16,
  fontWeight: 600,
  border: 'none',
  borderBottom: `3px solid ${active ? PRIMARY : 'transparent'}`,
  marginBottom: -3,
  background: 'none',
  color: active ? PRIMARY : TEXT_LIGHT,
  cursor: 'pointer',
  fontFamily: 'inherit',
  textAlign: 'center',
  transition: 'all 0.2s',
  '&:hover': {
    color: active ? PRIMARY : TEXT,
  },
  '@media (max-width: 600px)': {
    padding: '14px 12px',
    fontSize: 14,
  },
}));

// ─── Segmented Control ───

export const SegmentedControl = styled('div')({
  display: 'inline-flex',
  background: '#f2f0f9',
  borderRadius: 999,
  padding: 4,
  margin: '0 auto 24px',
  width: 'auto',
  maxWidth: 620,
  border: '1px solid #ecebf4',
  '@media (max-width: 600px)': {
    maxWidth: '100%',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': { display: 'none' },
  },
});

export const SegmentedControlCenter = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: 24,
});

export const SegmentedButton = styled('button')<{ active?: boolean }>(({ active }) => ({
  padding: '10px 22px',
  fontSize: 14,
  fontWeight: active ? 700 : 600,
  border: 'none',
  borderRadius: 999,
  background: active ? PRIMARY : 'transparent',
  color: active ? '#fff' : '#6b6580',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 0.18s, color 0.18s',
  flex: 1,
  whiteSpace: 'nowrap' as const,
  boxShadow: active ? '0 4px 12px rgba(108,92,231,0.28)' : 'none',
  '&:hover': {
    color: active ? '#fff' : '#443c66',
    background: active ? PRIMARY : 'rgba(108,92,231,0.07)',
  },
  '@media (max-width: 600px)': {
    padding: '9px 14px',
    fontSize: 12.5,
  },
}));

// ─── Game Sub-Tabs (connected segmented bar) ───

export const GameTabBar = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: 24,
});

export const GameTabGroup = styled('div')({
  display: 'inline-flex',
  borderRadius: 999,
  overflow: 'hidden',
  border: '1px solid #ecebf4',
  background: '#fff',
  maxWidth: '100%',
  '@media (max-width: 600px)': {
    overflowX: 'auto',
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': { display: 'none' },
  },
});

export const GameTab = styled('button')<{ active?: boolean }>(({ active }) => ({
  padding: '9px 20px',
  fontSize: 13,
  fontWeight: 600,
  border: 'none',
  borderInlineEnd: '1px solid #f0eef7',
  background: active ? PRIMARY : '#fff',
  color: active ? '#fff' : '#7a7391',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.2s',
  whiteSpace: 'nowrap' as const,
  '&:last-child': {
    borderInlineEnd: 'none',
  },
  '&:hover': {
    color: active ? '#fff' : '#443c66',
    background: active ? PRIMARY : '#f7f5fc',
  },
  '@media (max-width: 600px)': {
    padding: '8px 13px',
    fontSize: 11.5,
  },
}));

// ─── Chip / Tag ───

export const Chip = styled('span')({
  display: 'inline-block',
  padding: '3px 9px',
  fontSize: 11.5,
  fontWeight: 600,
  borderRadius: 999,
  background: '#f3f2f8',
  color: '#7a7391',
  letterSpacing: 0.2,
});

// ─── Status Badge ───

export const StatusBadge = styled('span')<{ status?: 'preview' | 'live' }>(({ status }) => ({
  display: 'inline-block',
  padding: '4px 11px',
  fontSize: 11.5,
  fontWeight: 700,
  borderRadius: 999,
  whiteSpace: 'nowrap',
  background: status === 'live' ? '#e7f6ea' : '#fff4e3',
  color: status === 'live' ? '#22803c' : '#c9670a',
  border: `1px solid ${status === 'live' ? '#c9e9d1' : '#f7dfbd'}`,
}));

// ─── Modal Overlay ───

export const ModalOverlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  overflow: 'hidden',
  overscrollBehavior: 'none',
});

export const ModalCard = styled('div')({
  background: '#fff',
  borderRadius: 16,
  padding: 32,
  maxWidth: 420,
  width: '90%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  textAlign: 'center',
});

// ─── Divider ───

export const Divider = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  color: TEXT_LIGHT,
  fontSize: 14,
  '&::before, &::after': {
    content: '""',
    flex: 1,
    height: 1,
    background: BORDER,
  },
});

export const GoogleButton = styled('button')({
  width: '100%',
  padding: 12,
  fontSize: 16,
  fontWeight: 600,
  color: TEXT,
  background: '#fff',
  border: `2px solid ${BORDER}`,
  borderRadius: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  transition: 'border-color 0.2s, background 0.2s',
  '&:hover': {
    borderColor: '#ccc',
    background: '#fafafa',
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
  '&:disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
});

// ─── Positioning ───

export const TopEndCorner = styled('div')({
  position: 'absolute',
  top: 16,
  insetInlineEnd: 16,
});

export const CenteredContent = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  textAlign: 'center',
  '@media (min-width: 768px)': {
    width: '100%',
    maxWidth: 760,
    marginInline: 'auto',
  },
});

// ─── Mobile Helpers ───

export const HideOnDesktop = styled('div')({
  display: 'none',
  '@media (max-width: 600px)': {
    display: 'block',
  },
});

export const DesktopOnly = styled('div')({
  display: 'block',
  '@media (max-width: 600px)': {
    display: 'none',
  },
});

export const MobileCardList = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

export const MobileCardItem = styled('div')({
  background: '#fff',
  border: '1px solid #ecebf4',
  borderRadius: 14,
  padding: 14,
  boxShadow: '0 1px 2px rgba(16,12,40,0.05)',
  cursor: 'pointer',
  transition: 'background 0.15s, border-color 0.15s',
  '&:active': {
    background: '#faf8fe',
    borderColor: '#ddd6f0',
  },
});

