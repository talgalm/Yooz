import { styled } from '@mui/material/styles';

const PRIMARY = '#6c5ce7';
const TEXT_DARK = '#333';
const TEXT_LIGHT = '#888';
const BORDER = '#ececf3';

// ─── KPI Cards ───

export const KpiRow = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 16,
  marginBottom: 24,
  '@media (max-width: 600px)': {
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
});

export const KpiCard = styled('div')({
  background: '#fff',
  borderRadius: 16,
  padding: '20px 24px',
  border: `1px solid ${BORDER}`,
  boxShadow: '0 4px 16px rgba(108,92,231,0.06)',
  '@media (max-width: 600px)': {
    padding: '14px 16px',
    borderRadius: 12,
  },
});

export const KpiValue = styled('div')({
  fontSize: 32,
  fontWeight: 800,
  color: PRIMARY,
  lineHeight: 1.2,
  '@media (max-width: 600px)': {
    fontSize: 24,
  },
});

export const KpiLabel = styled('div')({
  fontSize: 13,
  color: TEXT_LIGHT,
  marginTop: 4,
  fontWeight: 500,
});

export const KpiSub = styled('div')({
  fontSize: 12,
  color: TEXT_LIGHT,
  marginTop: 2,
});

// ─── Chart Containers ───

export const ChartCard = styled('div')({
  background: '#fff',
  borderRadius: 16,
  padding: 24,
  border: `1px solid ${BORDER}`,
  marginBottom: 24,
  boxShadow: '0 4px 16px rgba(108,92,231,0.06)',
  '@media (max-width: 600px)': {
    padding: 16,
    borderRadius: 12,
  },
});

export const ChartTitle = styled('h3')({
  fontSize: 16,
  fontWeight: 700,
  color: TEXT_DARK,
  margin: '0 0 16px',
});

// ─── Section Headers ───

export const SectionHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 16,
  gap: 12,
  flexWrap: 'wrap',
});

export const SectionTitle = styled('h2')({
  fontSize: 20,
  fontWeight: 700,
  color: TEXT_DARK,
  margin: 0,
});

export const BackButton = styled('button')({
  background: 'none',
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: '6px 16px',
  fontSize: 14,
  fontWeight: 600,
  color: TEXT_DARK,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': {
    background: '#f5f5f7',
  },
});

// ─── Activity Table (clickable rows) ───

export const StatsTable = styled('table')({
  width: '100%',
  borderCollapse: 'collapse',
  '& th': {
    textAlign: 'right',
    fontSize: 13,
    fontWeight: 600,
    color: TEXT_LIGHT,
    padding: '10px 14px',
    borderBottom: `2px solid ${BORDER}`,
  },
  '& td': {
    fontSize: 14,
    color: TEXT_DARK,
    padding: '12px 14px',
    borderBottom: `1px solid ${BORDER}`,
  },
  '& tbody tr': {
    cursor: 'pointer',
    transition: 'background 0.15s',
    '&:hover': {
      background: '#f8f7ff',
    },
  },
});

// ─── Funnel ───

export const FunnelContainer = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: '16px 0',
});

export const FunnelStep = styled('div')<{ widthPct: number }>(({ widthPct }) => ({
  background: `linear-gradient(90deg, ${PRIMARY} 0%, #a29bfe 100%)`,
  borderRadius: 10,
  padding: '14px 20px',
  color: '#fff',
  fontWeight: 700,
  fontSize: 15,
  width: `${Math.max(widthPct, 20)}%`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  transition: 'width 0.5s ease',
  opacity: 0.3 + (widthPct / 100) * 0.7,
  '@media (max-width: 600px)': {
    width: `${Math.max(widthPct, 40)}%`,
    padding: '10px 14px',
    fontSize: 13,
  },
}));

export const FunnelCount = styled('span')({
  fontSize: 13,
  opacity: 0.85,
});

// ─── Alerts ───

export const AlertBanner = styled('div')<{ severity: 'warning' | 'error' }>(({ severity }) => ({
  background: severity === 'error' ? '#fff5f5' : '#fffbeb',
  border: `1px solid ${severity === 'error' ? '#fecaca' : '#fde68a'}`,
  borderRadius: 12,
  padding: '12px 16px',
  marginBottom: 16,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 14,
  color: severity === 'error' ? '#991b1b' : '#92400e',
}));

export const AlertIcon = styled('span')({
  fontSize: 18,
  flexShrink: 0,
});

// ─── Sub-tab bar ───

export const SubTabBar = styled('div')({
  display: 'flex',
  gap: 0,
  marginBottom: 24,
  background: '#f5f5f7',
  borderRadius: 10,
  padding: 3,
  overflow: 'auto',
});

export const SubTab = styled('button')<{ active?: boolean }>(({ active }) => ({
  flex: 1,
  padding: '8px 16px',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'inherit',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  background: active ? '#fff' : 'transparent',
  color: active ? PRIMARY : TEXT_LIGHT,
  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
  transition: 'all 0.15s',
  whiteSpace: 'nowrap',
  '&:hover': {
    color: active ? PRIMARY : TEXT_DARK,
  },
}));

// ─── Export Buttons ───

export const ExportGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
});

export const ExportCard = styled('button')({
  background: '#fff',
  border: `2px solid ${BORDER}`,
  borderRadius: 14,
  padding: '24px 20px',
  textAlign: 'center',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s',
  '&:hover': {
    borderColor: PRIMARY,
    boxShadow: '0 4px 12px rgba(108,92,231,0.12)',
  },
});

export const ExportIcon = styled('div')({
  fontSize: 32,
  marginBottom: 8,
});

export const ExportLabel = styled('div')({
  fontSize: 15,
  fontWeight: 700,
  color: TEXT_DARK,
});

export const ExportDescription = styled('div')({
  fontSize: 12,
  color: TEXT_LIGHT,
  marginTop: 4,
});

// ─── Badge/Tag ───

export const ImprovementBadge = styled('span')({
  background: '#fef3c7',
  color: '#92400e',
  fontSize: 11,
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: 6,
  whiteSpace: 'nowrap',
});

// ─── Mobile cards (for responsive tables) ───

export const StatsMobileCard = styled('div')({
  background: '#fff',
  borderRadius: 12,
  padding: '14px 16px',
  border: `1px solid ${BORDER}`,
  marginBottom: 10,
  cursor: 'pointer',
  '&:hover': {
    background: '#f8f7ff',
  },
});

export const StatsMobileRow = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
  '& + &': {
    marginTop: 6,
  },
});

export const StatsMobileLabel = styled('span')({
  fontSize: 12,
  color: TEXT_LIGHT,
});

export const StatsMobileValue = styled('span')({
  fontSize: 14,
  fontWeight: 700,
  color: TEXT_DARK,
});
