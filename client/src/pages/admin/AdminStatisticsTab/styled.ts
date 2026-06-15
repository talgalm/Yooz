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
  boxSizing: 'border-box',
  maxWidth: '100%',
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 10,
  fontSize: 14,
  overflowWrap: 'anywhere',
  color: severity === 'error' ? '#991b1b' : '#92400e',
  '& > *': {
    minWidth: 0,
  },
}));

export const AlertIcon = styled('span')({
  fontSize: 18,
  flexShrink: 0,
});

export const AnalyticsHeader = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 16,
  alignItems: 'start',
  background: '#fff',
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: 22,
  marginBottom: 16,
  boxShadow: '0 10px 30px rgba(39, 43, 58, 0.06)',
  '@media (max-width: 760px)': {
    gridTemplateColumns: '1fr',
    padding: 16,
  },
});

export const HeaderEyebrow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  fontSize: 12,
  fontWeight: 800,
  color: '#5f6b7a',
  marginBottom: 8,
});

export const HeaderMeta = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  marginTop: 12,
});

export const MetaPill = styled('span')<{ tone?: 'neutral' | 'green' | 'blue' | 'amber' }>(({ tone = 'neutral' }) => {
  const tones = {
    neutral: { bg: '#f4f6f8', color: '#425466', border: '#e4e8ef' },
    green: { bg: '#edf8f2', color: '#1f7a4d', border: '#cfeedd' },
    blue: { bg: '#edf5ff', color: '#1769aa', border: '#d2e6fb' },
    amber: { bg: '#fff7e8', color: '#9a5b00', border: '#f3ddb5' },
  };
  return {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 28,
    padding: '0 10px',
    borderRadius: 8,
    border: `1px solid ${tones[tone].border}`,
    background: tones[tone].bg,
    color: tones[tone].color,
    fontSize: 12,
    fontWeight: 700,
  };
});

export const HeaderActionGroup = styled('div')({
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
  alignItems: 'center',
  '@media (max-width: 760px)': {
    justifyContent: 'flex-start',
  },
});

export const PeriodControl = styled('div')({
  display: 'inline-flex',
  alignItems: 'center',
  direction: 'rtl',
  gap: 4,
  padding: 3,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  background: '#f7f8fa',
  flexWrap: 'wrap',
});

export const PeriodLabel = styled('span')({
  padding: '0 8px',
  fontSize: 12,
  fontWeight: 800,
  color: '#5f6b7a',
});

export const PeriodButton = styled('button')<{ active?: boolean }>(({ active }) => ({
  border: 'none',
  borderRadius: 7,
  minHeight: 30,
  padding: '0 10px',
  fontSize: 12,
  fontWeight: 800,
  fontFamily: 'inherit',
  cursor: 'pointer',
  color: active ? '#fff' : '#425466',
  background: active ? PRIMARY : 'transparent',
  boxShadow: active ? '0 1px 3px rgba(39, 43, 58, 0.16)' : 'none',
  '&:hover': {
    background: active ? PRIMARY : '#fff',
  },
}));

export const ActionButton = styled('button')<{ variant?: 'primary' | 'neutral' }>(({ variant = 'neutral' }) => ({
  border: variant === 'primary' ? `1px solid ${PRIMARY}` : `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: '8px 14px',
  minHeight: 36,
  fontSize: 13,
  fontWeight: 800,
  color: variant === 'primary' ? '#fff' : TEXT_DARK,
  background: variant === 'primary' ? PRIMARY : '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': {
    background: variant === 'primary' ? '#5b4bd8' : '#f7f8fa',
  },
  '&:disabled': {
    cursor: 'not-allowed',
    opacity: 0.55,
  },
}));

export const DashboardGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
  gap: 16,
  alignItems: 'stretch',
  '@media (max-width: 960px)': {
    gridTemplateColumns: '1fr',
  },
});

export const FullPanel = styled('section')({
  gridColumn: '1 / -1',
  background: '#fff',
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: 18,
  boxShadow: '0 8px 24px rgba(39, 43, 58, 0.05)',
  minWidth: 0,
  '@media (max-width: 600px)': {
    padding: 14,
  },
});

export const WidePanel = styled(FullPanel)({
  gridColumn: 'span 8',
  '@media (max-width: 960px)': {
    gridColumn: '1 / -1',
  },
});

export const NarrowPanel = styled(FullPanel)({
  gridColumn: 'span 4',
  '@media (max-width: 960px)': {
    gridColumn: '1 / -1',
  },
});

export const PanelTitle = styled('h3')({
  margin: '0 0 14px',
  fontSize: 15,
  fontWeight: 800,
  color: TEXT_DARK,
});

export const MetricGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 12,
  '@media (max-width: 620px)': {
    gridTemplateColumns: '1fr 1fr',
  },
  '@media (max-width: 440px)': {
    gridTemplateColumns: '1fr',
  },
});

export const MetricCard = styled('div')<{ tone?: 'purple' | 'green' | 'blue' | 'amber' | 'red' }>(({ tone = 'purple' }) => {
  const tones = {
    purple: { bg: '#fbfaff', color: PRIMARY, border: '#e8e4ff' },
    green: { bg: '#f4fbf7', color: '#1f7a4d', border: '#d7efe2' },
    blue: { bg: '#f4f9ff', color: '#1769aa', border: '#d7e9fb' },
    amber: { bg: '#fffaf0', color: '#9a5b00', border: '#f0dfbf' },
    red: { bg: '#fff5f5', color: '#b42318', border: '#f5d1d1' },
  };
  return {
    minHeight: 132,
    border: `1px solid ${tones[tone].border}`,
    borderRadius: 8,
    background: tones[tone].bg,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minWidth: 0,
    boxSizing: 'border-box',
    color: tones[tone].color,
  };
});

export const MetricLabel = styled('div')({
  fontSize: 12,
  fontWeight: 800,
  color: '#5f6b7a',
  lineHeight: 1.35,
});

export const MetricValue = styled('div')({
  fontSize: 30,
  fontWeight: 900,
  lineHeight: 1.1,
  color: 'currentColor',
  wordBreak: 'break-word',
  '@media (max-width: 620px)': {
    fontSize: 24,
  },
});

export const MetricSubtext = styled('div')({
  fontSize: 12,
  fontWeight: 700,
  color: '#697586',
  lineHeight: 1.35,
});

export const StatusStack = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
});

export const StatusBar = styled('div')({
  height: 16,
  display: 'flex',
  overflow: 'hidden',
  borderRadius: 8,
  background: '#eef1f5',
});

export const StatusSegment = styled('div')<{ pct: number; tone: 'green' | 'blue' | 'amber' }>(({ pct, tone }) => ({
  width: `${Math.max(0, Math.min(100, pct))}%`,
  minWidth: pct > 0 ? 4 : 0,
  background: tone === 'green' ? '#2fb36d' : tone === 'blue' ? '#2d8bd8' : '#f2a93b',
}));

export const StatusLegend = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 10,
  '@media (max-width: 560px)': {
    gridTemplateColumns: '1fr',
  },
});

export const LegendItem = styled('div')({
  border: '1px solid #edf0f4',
  borderRadius: 8,
  padding: 10,
  background: '#fafbfc',
});

export const LegendLabel = styled('div')({
  fontSize: 12,
  fontWeight: 700,
  color: '#697586',
  marginBottom: 4,
});

export const LegendValue = styled('div')({
  fontSize: 20,
  fontWeight: 900,
  color: TEXT_DARK,
});

export const InsightList = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

export const InsightItem = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 12,
  alignItems: 'center',
  border: '1px solid #edf0f4',
  borderRadius: 8,
  padding: '10px 12px',
  background: '#fff',
});

export const InsightMain = styled('div')({
  minWidth: 0,
});

export const InsightTitle = styled('div')({
  fontSize: 13,
  fontWeight: 800,
  color: TEXT_DARK,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const InsightMeta = styled('div')({
  fontSize: 12,
  color: '#697586',
  marginTop: 2,
});

export const ValueBadge = styled('span')<{ tone?: 'green' | 'blue' | 'amber' | 'red' | 'neutral' }>(({ tone = 'neutral' }) => {
  const tones = {
    green: { bg: '#edf8f2', color: '#1f7a4d' },
    blue: { bg: '#edf5ff', color: '#1769aa' },
    amber: { bg: '#fff7e8', color: '#9a5b00' },
    red: { bg: '#fff1f0', color: '#b42318' },
    neutral: { bg: '#f4f6f8', color: '#425466' },
  };
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 26,
    padding: '0 9px',
    borderRadius: 8,
    background: tones[tone].bg,
    color: tones[tone].color,
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  };
});

export const NumberRun = styled('span')({
  direction: 'ltr',
  unicodeBidi: 'isolate',
  display: 'inline-block',
});

export const ProgressTrack = styled('div')({
  height: 8,
  borderRadius: 8,
  background: '#edf0f4',
  overflow: 'hidden',
  minWidth: 80,
});

export const ProgressFill = styled('div')<{ pct: number; tone?: 'green' | 'blue' | 'amber' | 'red' }>(({ pct, tone = 'blue' }) => ({
  height: '100%',
  width: `${Math.max(0, Math.min(100, pct))}%`,
  borderRadius: 8,
  background: tone === 'green' ? '#2fb36d' : tone === 'amber' ? '#f2a93b' : tone === 'red' ? '#e05252' : '#2d8bd8',
}));

export const ParticipantTable = styled('table')({
  width: '100%',
  borderCollapse: 'collapse',
  '& th': {
    textAlign: 'start',
    padding: '8px 10px',
    fontSize: 12,
    fontWeight: 800,
    color: '#697586',
    borderBottom: '1px solid #edf0f4',
  },
  '& td': {
    padding: '10px',
    borderBottom: '1px solid #f0f2f5',
    fontSize: 13,
    color: TEXT_DARK,
    verticalAlign: 'middle',
  },
  '& tr:last-child td': {
    borderBottom: 'none',
  },
});

export const RankBadge = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 26,
  height: 26,
  borderRadius: 8,
  background: '#f4f6f8',
  color: '#425466',
  fontSize: 12,
  fontWeight: 900,
});

export const ItemHealthGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 10,
  '@media (max-width: 620px)': {
    gridTemplateColumns: '1fr',
  },
});

export const ItemHealthCard = styled('div')({
  border: '1px solid #edf0f4',
  borderRadius: 8,
  padding: 12,
  background: '#fff',
  minWidth: 0,
});

export const RecommendationCard = styled('div')<{ tone?: 'green' | 'amber' | 'red' | 'blue' }>(({ tone = 'blue' }) => ({
  borderRadius: 8,
  padding: 12,
  border: `1px solid ${tone === 'green' ? '#cfeedd' : tone === 'amber' ? '#f3ddb5' : tone === 'red' ? '#f5d1d1' : '#d2e6fb'}`,
  background: tone === 'green' ? '#f4fbf7' : tone === 'amber' ? '#fffaf0' : tone === 'red' ? '#fff5f5' : '#f4f9ff',
}));

export const RecommendationTitle = styled('div')({
  fontSize: 13,
  fontWeight: 900,
  color: TEXT_DARK,
  marginBottom: 4,
});

export const RecommendationBody = styled('div')({
  fontSize: 12,
  lineHeight: 1.45,
  color: '#5f6b7a',
});

export const EmptyState = styled('div')({
  textAlign: 'center',
  color: '#697586',
  padding: 24,
  fontSize: 13,
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

// ─── Pass grade control ───

export const PassGradeCard = styled('div')({
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  background: '#fff',
  padding: 16,
  marginBottom: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

export const PassGradeTitleRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
});

export const PassGradeTitle = styled('div')({
  fontSize: 15,
  fontWeight: 800,
  color: TEXT_DARK,
});

export const PassGradeDescription = styled('div')({
  fontSize: 13,
  color: TEXT_LIGHT,
  lineHeight: 1.5,
});

export const PassGradeControlRow = styled('div')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
});

export const PassGradeInput = styled('input')({
  width: 80,
  height: 38,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: '0 12px',
  fontSize: 16,
  fontWeight: 800,
  fontFamily: 'inherit',
  textAlign: 'center',
  color: TEXT_DARK,
  background: '#fff',
});

export const PassGradePreset = styled('button')({
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  minHeight: 34,
  padding: '0 12px',
  fontSize: 14,
  fontWeight: 800,
  fontFamily: 'inherit',
  cursor: 'pointer',
  color: TEXT_DARK,
  background: '#f7f8fa',
  '&:hover': { background: '#eef1f6' },
  '&:disabled': { opacity: 0.5, cursor: 'default' },
});

// ─── Share link control ───

export const ShareRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  width: '100%',
});

export const ShareUrlInput = styled('input')({
  flex: 1,
  minWidth: 180,
  height: 38,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: '0 12px',
  fontSize: 13,
  fontFamily: 'inherit',
  color: TEXT_DARK,
  background: '#f7f8fa',
  direction: 'ltr',
  textOverflow: 'ellipsis',
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
