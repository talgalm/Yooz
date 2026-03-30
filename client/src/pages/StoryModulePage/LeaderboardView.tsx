import React, { useId } from 'react';
import ActivityLogoutButton from '../../components/ActivityLogoutButton';
import { HelpChatHeaderButton } from '../../components/HelpChat';
import LangDrawer from '../../components/LangDrawer';
import NatureBackground from '../../components/NatureBackground';
import { styled, keyframes } from '@mui/material/styles';
import { HeaderBar, HeaderActions, AccentText, BodyText } from '../../components/styled';
import type { LeaderboardEntry } from './types';

// ─── Colors ───

const C_DARK_GREEN = '#689f38';
const C_DARKER_GREEN = '#33691e';
const C_YELLOW_STAR = '#6c5ce7';
const C_GOLD = '#ffd700';
const C_SILVER = '#c0c0c0';
const C_BRONZE = '#cd7f32';
const C_LIGHT_GREEN = '#c5e1a5';

// ─── Animations ───

const ribbonSlide = keyframes`
  0% { transform: scaleX(0); opacity: 0; }
  100% { transform: scaleX(1); opacity: 1; }
`;

const cardSlideIn = keyframes`
  0% { transform: translateX(-20px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
`;

// ─── Styled Components ───

const Content = styled('div')({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
});

/** Fills space under the header; only this region scrolls (height follows viewport). */
const MainScroll = styled('div')({
  flex: 1,
  minHeight: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '16px 16px 8px',
  boxSizing: 'border-box',
  overflowY: 'auto',
  overflowX: 'hidden',
  overscrollBehavior: 'contain',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  '&::-webkit-scrollbar': {
    display: 'none',
    width: 0,
    height: 0,
  },
});

const BackFooter = styled('div')({
  flexShrink: 0,
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
  boxSizing: 'border-box',
  background: 'linear-gradient(to top, rgba(0,0,0,0.06) 0%, transparent 100%)',
});

const RibbonTitle = styled('div')({
  position: 'relative',
  background: C_DARK_GREEN,
  color: '#fff',
  fontSize: 16,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: 2,
  padding: '10px 32px',
  borderRadius: 4,
  textAlign: 'center',
  marginBottom: 20,
  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
  animation: `${ribbonSlide} 0.5s ease-out 0.1s both`,
  '&::before, &::after': {
    content: '""',
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 0,
    height: 0,
    borderStyle: 'solid',
  },
  '&::before': {
    left: -10,
    borderWidth: '14px 10px 14px 0',
    borderColor: `transparent ${C_DARK_GREEN} transparent transparent`,
  },
  '&::after': {
    right: -10,
    borderWidth: '14px 0 14px 10px',
    borderColor: `transparent transparent transparent ${C_DARK_GREEN}`,
  },
});

const PlayerList = styled('div')({
  width: '100%',
  maxWidth: 380,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '4px 2px',
});

const PlayerCard = styled('div')<{ highlighted?: boolean; animDelay?: number }>(
  ({ highlighted, animDelay = 0 }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: highlighted ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    border: highlighted ? `3px solid ${C_YELLOW_STAR}` : '3px solid transparent',
    boxShadow: highlighted
      ? `0 4px 16px rgba(255,202,40,0.35), 0 2px 8px rgba(0,0,0,0.1)`
      : '0 2px 8px rgba(0,0,0,0.1)',
    animation: `${cardSlideIn} 0.3s ease-out ${0.15 + animDelay * 0.06}s both`,
    transition: 'transform 0.15s',
  }),
);

const RankBadge = styled('div')<{ medalColor?: string; rank?: number }>(({ medalColor, rank }) => {
  const isMedalIcon = rank === 1 || rank === 2 || rank === 3;
  const base = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontWeight: 900,
  };
  if (isMedalIcon) {
    return {
      ...base,
      width: 42,
      height: 50,
      borderRadius: 0,
      fontSize: 14,
      background: 'transparent',
      border: 'none',
      boxShadow: 'none',
      color: 'inherit',
    };
  }
  return {
    ...base,
    width: 35,
    height: 35,
    borderRadius: '50%',
    fontSize: medalColor ? 18 : 14,
    ...(medalColor
      ? {
          background: medalColor,
          color: '#fff',
          boxShadow: `0 2px 6px ${medalColor}66`,
          border: `2px solid ${medalColor === C_GOLD ? '#e6c200' : medalColor === C_SILVER ? '#a8a8a8' : '#b06a2a'}`,
        }
      : {
          background: C_LIGHT_GREEN,
          color: C_DARKER_GREEN,
          border: `2px solid ${C_DARK_GREEN}33`,
        }),
  };
});

const PlayerInfo = styled('div')({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
});

const PlayerName = styled('div')({
  fontSize: 15,
  fontWeight: 700,
  color: C_DARKER_GREEN,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const PlayerGroup = styled('span')({
  fontSize: 11,
  color: '#999',
  fontWeight: 500,
});

const ScoreSection = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 1,
  flexShrink: 0,
});

const ScoreValue = styled('div')({
  fontSize: 18,
  fontWeight: 900,
  color: C_DARKER_GREEN,
  lineHeight: 1,
});

const ScoreLabel = styled('div')({
  fontSize: 9,
  fontWeight: 600,
  color: '#aaa',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
});

const BackButton = styled('button')({
  padding: '12px 36px',
  background: 'rgba(255,255,255,0.92)',
  color: C_DARKER_GREEN,
  border: `2px solid ${C_LIGHT_GREEN}`,
  borderRadius: 50,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'background 0.15s',
  boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
  '&:hover': {
    background: 'rgba(255,255,255,1)',
  },
});

const LoadingText = styled(BodyText)({
  color: 'rgba(255,255,255,0.8)',
  marginTop: 40,
});

const EmptyText = styled(BodyText)({
  color: 'rgba(255,255,255,0.7)',
  marginTop: 40,
  fontSize: 15,
});

// ─── Helpers ───

function getMedalColor(rank: number): string | undefined {
  if (rank === 1) return C_GOLD;
  if (rank === 2) return C_SILVER;
  if (rank === 3) return C_BRONZE;
  return undefined;
}

/** Truncates to at most one decimal (e.g. 315.65999999 → 315.6). Whole numbers stay integer strings. */
function formatLeaderboardScore(score: number): string {
  const n = typeof score === 'number' && !Number.isNaN(score) ? score : Number(score);
  if (!Number.isFinite(n)) return '0';
  const scaled = n * 10;
  const eps = 1e-9;
  const t = (scaled >= 0 ? Math.floor(scaled + eps) : Math.ceil(scaled - eps)) / 10;
  return Number.isInteger(t) ? String(t) : t.toFixed(1);
}

const GOLD_MEDAL_SVG = `<svg width="100%" viewBox="-3.5 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.73779 18.8436L12.9509 20.6987L6.42609 32.0001L4.55333 27.8234L9.73779 18.8436Z" fill="#AA75CB" style="fill:rgb(170, 117, 203);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<path d="M9.73779 18.8436L6.52467 16.9885L-0.000155079 28.2899L4.55333 27.8234L9.73779 18.8436Z" fill="#73488D" style="fill:rgb(115, 72, 141);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<path d="M14.3218 18.8436L11.1087 20.6987L17.6335 32.0001L19.5062 27.8234L14.3218 18.8436Z" fill="#73488D" style="fill:rgb(115, 72, 141);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<path d="M14.3218 18.8436L17.5349 16.9885L24.0597 28.2899L19.5062 27.8234L14.3218 18.8436Z" fill="#AA75CB" style="fill:rgb(170, 117, 203);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<circle cx="12.0246" cy="11.0622" r="11.0622" fill="#DC9E42" style="fill:rgb(220, 158, 66);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<circle cx="12.0247" cy="11.0621" r="8.63501" fill="#734C12" style="fill:rgb(115, 76, 18);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<mask id="mask0_gold" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="3" y="3" width="19" height="18">
<circle cx="12.4857" cy="11.984" r="8.65511" fill="#C28B37"/>
</mask>
<g mask="url(#mask0_gold)" style="fill:none;stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
<circle cx="12.0247" cy="11.0622" r="8.65511" fill="#A36D1D" style="fill:rgb(163, 109, 29);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
</g>
<text x="12.07" y="15.2" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="900" fill="url(#numgrad_gold)" style="stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:Arial, sans-serif;font-size:9px;font-weight:900;text-anchor:middle;dominant-baseline:auto">1</text>
<defs>
<linearGradient id="numgrad_gold" x1="12" y1="6" x2="12" y2="16" gradientUnits="userSpaceOnUse">
<stop stop-color="#FCFF80"/>
<stop offset="0.4" stop-color="#FDE870"/>
<stop offset="1" stop-color="#FFC759"/>
</linearGradient>
</defs>
</svg>`;

const SILVER_MEDAL_SVG = `<svg width="100%" viewBox="-3.5 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.73779 18.8436L12.9509 20.6987L6.42609 32.0001L4.55333 27.8234L9.73779 18.8436Z" fill="#90A4AE" style="fill:rgb(144, 164, 174);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<path d="M9.73779 18.8436L6.52467 16.9885L-0.000155079 28.2899L4.55333 27.8234L9.73779 18.8436Z" fill="#546E7A" style="fill:rgb(84, 110, 122);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<path d="M14.3218 18.8436L11.1087 20.6987L17.6335 32.0001L19.5062 27.8234L14.3218 18.8436Z" fill="#546E7A" style="fill:rgb(84, 110, 122);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<path d="M14.3218 18.8436L17.5349 16.9885L24.0597 28.2899L19.5062 27.8234L14.3218 18.8436Z" fill="#90A4AE" style="fill:rgb(144, 164, 174);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<circle cx="12.0246" cy="11.0622" r="11.0622" fill="#B0BEC5" style="fill:rgb(176, 190, 197);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<circle cx="12.0247" cy="11.0621" r="8.63501" fill="#455A64" style="fill:rgb(69, 90, 100);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<mask id="mask0_silver" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="3" y="3" width="19" height="18">
<circle cx="12.4857" cy="11.984" r="8.65511" fill="#78909C"/>
</mask>
<g mask="url(#mask0_silver)" style="fill:none;stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
<circle cx="12.0247" cy="11.0622" r="8.65511" fill="#607D8B" style="fill:rgb(96, 125, 139);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
</g>
<text x="12.07" y="15.2" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="900" fill="url(#numgrad_silver)" style="stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:Arial, sans-serif;font-size:9px;font-weight:900;text-anchor:middle;dominant-baseline:auto">2</text>
<defs>
<linearGradient id="numgrad_silver" x1="12" y1="6" x2="12" y2="16" gradientUnits="userSpaceOnUse">
<stop stop-color="#ECEFF1"/>
<stop offset="0.4" stop-color="#CFD8DC"/>
<stop offset="1" stop-color="#B0BEC5"/>
</linearGradient>
</defs>
</svg>`;

const BRONZE_MEDAL_SVG = `<svg width="100%" viewBox="-3.5 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.73779 18.8436L12.9509 20.6987L6.42609 32.0001L4.55333 27.8234L9.73779 18.8436Z" fill="#C17F4A" style="fill:rgb(193, 127, 74);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<path d="M9.73779 18.8436L6.52467 16.9885L-0.000155079 28.2899L4.55333 27.8234L9.73779 18.8436Z" fill="#8B5318" style="fill:rgb(139, 83, 24);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<path d="M14.3218 18.8436L11.1087 20.6987L17.6335 32.0001L19.5062 27.8234L14.3218 18.8436Z" fill="#8B5318" style="fill:rgb(139, 83, 24);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<path d="M14.3218 18.8436L17.5349 16.9885L24.0597 28.2899L19.5062 27.8234L14.3218 18.8436Z" fill="#C17F4A" style="fill:rgb(193, 127, 74);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<circle cx="12.0246" cy="11.0622" r="11.0622" fill="#CD7F32" style="fill:rgb(205, 127, 50);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<circle cx="12.0247" cy="11.0621" r="8.63501" fill="#6D3A10" style="fill:rgb(109, 58, 16);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<mask id="mask0_bronze" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="3" y="3" width="19" height="18">
<circle cx="12.4857" cy="11.984" r="8.65511" fill="#A0622A"/>
</mask>
<g mask="url(#mask0_bronze)" style="fill:none;stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
<circle cx="12.0247" cy="11.0622" r="8.65511" fill="#8B5318" style="fill:rgb(139, 83, 24);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
</g>
<text x="12.07" y="15.2" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="900" fill="url(#numgrad_bronze)" style="stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:Arial, sans-serif;font-size:9px;font-weight:900;text-anchor:middle;dominant-baseline:auto">3</text>
<defs>
<linearGradient id="numgrad_bronze" x1="12" y1="6" x2="12" y2="16" gradientUnits="userSpaceOnUse">
<stop stop-color="#FFCC80"/>
<stop offset="0.4" stop-color="#FFA040"/>
<stop offset="1" stop-color="#E67520"/>
</linearGradient>
</defs>
</svg>`;

function SvgMedalIcon({ svg, idNames }: { svg: string; idNames: string[] }) {
  const uid = useId().replace(/\W/g, '');
  let out = svg.replace('width="100%"', 'width="100%" height="100%"');
  for (const idName of idNames) {
    out = out.split(idName).join(`${idName}-${uid}`);
  }

  return (
    <span
      aria-hidden
      style={{ display: 'block', width: '100%', height: '100%' }}
      dangerouslySetInnerHTML={{ __html: out }}
    />
  );
}

function FirstPlaceMedalIcon() {
  return <SvgMedalIcon svg={GOLD_MEDAL_SVG} idNames={['mask0_gold', 'numgrad_gold']} />;
}

function SecondPlaceMedalIcon() {
  return <SvgMedalIcon svg={SILVER_MEDAL_SVG} idNames={['mask0_silver', 'numgrad_silver']} />;
}

function ThirdPlaceMedalIcon() {
  return <SvgMedalIcon svg={BRONZE_MEDAL_SVG} idNames={['mask0_bronze', 'numgrad_bronze']} />;
}

/** Top-three ranks use matching ribbon medals. */
function TrophyIcon({ rank }: { rank: number }) {
  if (rank === 1) return <FirstPlaceMedalIcon />;
  if (rank === 2) return <SecondPlaceMedalIcon />;
  if (rank === 3) return <ThirdPlaceMedalIcon />;
  return null;
}

// ─── Component ───

interface LeaderboardViewProps {
  activityName: string;
  leaderboard: LeaderboardEntry[];
  currentParticipantName?: string;
  isLoading: boolean;
  bgStyle: React.CSSProperties;
  onBack: () => void;
  onLogout: () => void;
  t: Record<string, string>;
}

export default function LeaderboardView({
  activityName,
  leaderboard,
  currentParticipantName,
  isLoading,
  onBack,
  onLogout,
  t,
}: LeaderboardViewProps) {
  return (
    <NatureBackground>
      <HeaderBar
        style={{
          flexShrink: 0,
          background: 'rgba(0,0,0,0.1)',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
        }}
      >
        <AccentText style={{ color: '#fff' }}>{activityName}</AccentText>
        <HeaderActions>
          <HelpChatHeaderButton />
          <ActivityLogoutButton onClick={onLogout} ariaLabel={t.exitActivity} />
          <LangDrawer variant="darkHeader" />
        </HeaderActions>
      </HeaderBar>

      <Content>
        <MainScroll>
          <RibbonTitle>{t.leaderboardTitle}</RibbonTitle>

          {isLoading ? (
            <LoadingText>{t.leaderboardLoading}</LoadingText>
          ) : leaderboard.length === 0 ? (
            <EmptyText>{t.leaderboardEmpty}</EmptyText>
          ) : (
            <PlayerList>
              {leaderboard.map((entry, i) => {
                const isMe = currentParticipantName === entry.name;
                const medalColor = getMedalColor(entry.rank);
                return (
                  <PlayerCard
                    key={`${entry.rank}-${entry.name}`}
                    highlighted={isMe}
                    animDelay={i}
                  >
                    <RankBadge medalColor={medalColor} rank={entry.rank}>
                      {medalColor ? <TrophyIcon rank={entry.rank} /> : entry.rank}
                    </RankBadge>

                    <PlayerInfo>
                      <PlayerName>{entry.name}</PlayerName>
                      {entry.group && <PlayerGroup>{entry.group}</PlayerGroup>}
                    </PlayerInfo>

                    <ScoreSection>
                      <ScoreValue>{formatLeaderboardScore(entry.score)}</ScoreValue>
                      <ScoreLabel>{t.finishStars || 'Points'}</ScoreLabel>
                    </ScoreSection>
                  </PlayerCard>
                );
              })}
            </PlayerList>
          )}
        </MainScroll>

        <BackFooter>
          <BackButton type="button" onClick={onBack}>
            {t.leaderboardBack}
          </BackButton>
        </BackFooter>
      </Content>
    </NatureBackground>
  );
}
