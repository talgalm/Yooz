import { styled } from '@mui/material/styles';
import { PRIMARY, PRIMARY_LIGHT, BORDER, TEXT, TEXT_LIGHT } from '../../components/styled';

/** Layout + form primitives shared by the /manage screens. */

export const MOBILE = '@media (max-width: 900px)';

export const PageHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
  marginBottom: 18,
});

/** For entity names (a client, a project) — always shown. */
export const PageTitle = styled('h1')({
  margin: 0,
  fontSize: 26,
  fontWeight: 700,
  [MOBILE]: { fontSize: 20 },
});

/** For a menu section's own name. Hidden on mobile, where the top bar already says it. */
export const SectionTitle = styled(PageTitle)({
  [MOBILE]: { display: 'none' },
});

export const Panel = styled('div')({
  background: '#fff',
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  overflow: 'hidden',
});

/** Wide tables scroll inside their own box; the page never scrolls sideways. */
export const TableScroll = styled('div')({
  width: '100%',
  overflowX: 'auto',
});

export const Toolbar = styled('div')({
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginBottom: 14,
});

export const SmallInput = styled('input')({
  padding: '9px 12px',
  fontSize: 14,
  border: `1px solid ${BORDER}`,
  borderRadius: 9,
  outline: 'none',
  background: '#fff',
  fontFamily: 'inherit',
  minWidth: 0,
  '&:focus': { borderColor: PRIMARY },
});

export const SmallSelect = styled('select')({
  padding: '9px 12px',
  fontSize: 14,
  border: `1px solid ${BORDER}`,
  borderRadius: 9,
  outline: 'none',
  background: '#fff',
  fontFamily: 'inherit',
  cursor: 'pointer',
  '&:focus': { borderColor: PRIMARY },
});

export const SmallTextarea = styled('textarea')({
  padding: '9px 12px',
  fontSize: 14,
  border: `1px solid ${BORDER}`,
  borderRadius: 9,
  outline: 'none',
  background: '#fff',
  fontFamily: 'inherit',
  resize: 'vertical',
  minHeight: 72,
  '&:focus': { borderColor: PRIMARY },
});

export const Button = styled('button')({
  padding: '9px 16px',
  fontSize: 14,
  fontWeight: 600,
  color: '#fff',
  background: PRIMARY,
  border: 'none',
  borderRadius: 9,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:disabled': { opacity: 0.55, cursor: 'not-allowed' },
});

export const GhostButton = styled('button')({
  padding: '9px 16px',
  fontSize: 14,
  fontWeight: 600,
  color: PRIMARY,
  background: '#fff',
  border: `1px solid ${BORDER}`,
  borderRadius: 9,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { background: PRIMARY_LIGHT },
});

export const DangerButton = styled('button')({
  padding: '9px 16px',
  fontSize: 14,
  fontWeight: 600,
  color: '#c62828',
  background: '#fff',
  border: '1px solid #f3c9c6',
  borderRadius: 9,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { background: '#fdecea' },
  '&:disabled': { opacity: 0.55, cursor: 'not-allowed' },
});

export const LinkButton = styled('button')({
  padding: 0,
  border: 'none',
  background: 'none',
  color: TEXT_LIGHT,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { color: PRIMARY },
});

export const Pill = styled('span')<{ tone?: 'default' | 'warn' | 'muted' }>(({ tone = 'default' }) => ({
  display: 'inline-block',
  padding: '3px 9px',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 999,
  whiteSpace: 'nowrap',
  ...(tone === 'warn'
    ? { background: '#fdecea', color: '#c62828' }
    : tone === 'muted'
      ? { background: '#f2f2f6', color: TEXT_LIGHT }
      : { background: PRIMARY_LIGHT, color: PRIMARY }),
}));

export const EmptyState = styled('div')({
  padding: 36,
  textAlign: 'center',
  color: TEXT_LIGHT,
  fontSize: 14,
});

export const ErrorNote = styled('div')({
  padding: '10px 14px',
  marginBottom: 12,
  borderRadius: 9,
  background: '#fdecea',
  color: '#c62828',
  fontSize: 14,
});

export const Tabs = styled('div')({
  display: 'flex',
  gap: 4,
  borderBottom: `1px solid ${BORDER}`,
  marginBottom: 18,
  overflowX: 'auto',
});

export const Tab = styled('button')<{ active?: boolean }>(({ active }) => ({
  padding: '10px 16px',
  fontSize: 14,
  fontWeight: 600,
  color: active ? PRIMARY : TEXT_LIGHT,
  background: 'none',
  border: 'none',
  borderBottom: `2px solid ${active ? PRIMARY : 'transparent'}`,
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
}));

export const FieldGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 14,
});

export const Field = styled('label')({
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  fontSize: 13,
  fontWeight: 600,
  color: TEXT_LIGHT,
});

export const ReadField = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  fontSize: 13,
  color: TEXT_LIGHT,
  '& > b': { fontSize: 15, fontWeight: 500, color: TEXT },
});

// ─── Modal ───

export const ModalBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
});

export const ModalCard = styled('div')({
  width: '100%',
  maxWidth: 560,
  maxHeight: '90dvh',
  overflowY: 'auto',
  background: '#fff',
  borderRadius: 16,
  padding: 22,
});

export const ModalTitle = styled('h2')({
  margin: '0 0 16px',
  fontSize: 19,
  fontWeight: 700,
});

export const ModalActions = styled('div')({
  display: 'flex',
  gap: 10,
  justifyContent: 'flex-end',
  marginTop: 20,
});
