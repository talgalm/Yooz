import { useState, useEffect, useRef, useCallback } from 'react';
import { styled, keyframes } from '@mui/material/styles';

const API = import.meta.env.VITE_API_URL || '';
import {
  MissionWrapper,
  FrameContainer,
  FrameHeaderOverlay,
  FrameFooterOverlay,
  MissionHeader,
  HeaderText,
  MissionContent,
  MissionButton,
} from './MissionFrame';
import MissionTopMenu from './MissionTopMenu';

// ─── Design tokens ───
const MISSION_FONT = "'Rubik', sans-serif";
const MISSION_TEXT = '#F2F7FF';
const MISSION_TEAL = '#39CABC';

const SHARE_MESSAGE_PREFIX = 'אני נהנתי בפעילות בגני יהושע - זה הזמן שלכם! היכנסו לקישור';

function buildSharePlainText(activityUrl: string): string {
  return `${SHARE_MESSAGE_PREFIX} הזה ${activityUrl}`;
}

function buildShareHtml(activityUrl: string): string {
  return `${SHARE_MESSAGE_PREFIX} <a href="${activityUrl}">הזה</a>`;
}

function buildFacebookShareUrl(activityUrl: string): string {
  const u = encodeURIComponent(activityUrl);
  // Only `u` is supported; extra params are ignored and can break mobile deep links.
  return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
}

function openFacebookShare(activityUrl: string): void {
  const url = buildFacebookShareUrl(activityUrl);
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (!w) window.location.assign(url);
}

/** SVG textPath ignores bidi on Safari; reverse + bidi-override renders RTL correctly everywhere. */
function textForSvgTextPath(text: string): string {
  return [...text].reverse().join('');
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const popIn = keyframes`
  0%   { opacity: 0; transform: scale(0.3); }
  60%  { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
`;

const popOut = keyframes`
  0%   { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.3); }
`;

// ─── Layout ───

const PageWrapper = styled('div')({
  position: 'fixed',
  inset: 0,
  width: '100vw',
  height: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  overscrollBehavior: 'none',
  backgroundColor: '#1a0a2e',
  backgroundImage: 'url(/images/mission-bg-1.svg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  zIndex: 10,
});

const TopBar = styled('div')({
  display: 'flex',
  background: '#BA5640',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0px 16px 0',
  direction: 'rtl',
  position: 'relative',
  zIndex: 5,
});

const ScoreBox = styled('div')<{ $flash?: 'positive' | 'negative' | null }>(({ $flash }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  color: $flash === 'positive' ? '#62FF8C' : $flash === 'negative' ? '#FF6A6A' : MISSION_TEXT,
  fontFamily: MISSION_FONT,
  fontSize: 20,
  transform: $flash ? 'scale(1.18)' : 'scale(1)',
  transformOrigin: 'center',
  transition: 'color 0.18s ease, transform 0.18s ease',
}));

// ─── Share modal overlay ───

const ShareModalOverlay = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  background: 'rgba(10,4,26,0.82)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const ShareModalBox = styled('div')({
  background: 'linear-gradient(160deg, #1a0a2e 60%, #0e1a2e 100%)',
  border: `1.5px solid ${MISSION_TEAL}`,
  borderRadius: 20,
  padding: '28px 24px 20px',
  width: 'clamp(260px, 80vw, 340px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 16,
  fontFamily: "'Rubik', sans-serif",
  color: '#F2F7FF',
  direction: 'rtl',
});

const ShareOptionRow = styled('div')({
  display: 'flex',
  gap: 16,
  justifyContent: 'center',
});

const ShareOption = styled('button')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  background: 'rgba(57,202,188,0.12)',
  border: `1px solid ${MISSION_TEAL}`,
  borderRadius: 14,
  padding: '12px 16px',
  color: '#F2F7FF',
  fontFamily: "'Rubik', sans-serif",
  fontSize: 12,
  cursor: 'pointer',
  minWidth: 72,
  '&:active': { opacity: 0.7 },
});

const ShareCopyRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
});

const ShareLinkInput = styled('input')({
  flex: 1,
  background: 'rgba(255,255,255,0.07)',
  border: `1px solid ${MISSION_TEAL}`,
  borderRadius: 8,
  color: '#F2F7FF',
  fontFamily: "'Rubik', sans-serif",
  fontSize: 12,
  padding: '6px 10px',
  direction: 'ltr',
  outline: 'none',
});

const ShareCopyBtn = styled('button')({
  background: MISSION_TEAL,
  border: 'none',
  borderRadius: 8,
  color: '#1a0a2e',
  fontFamily: "'Rubik', sans-serif",
  fontWeight: 700,
  fontSize: 12,
  padding: '6px 12px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

const ShareCloseBtn = styled('button')({
  background: 'none',
  border: 'none',
  color: 'rgba(242,247,255,0.5)',
  fontFamily: "'Rubik', sans-serif",
  fontSize: 13,
  cursor: 'pointer',
  marginTop: 4,
});

const ShareButtonLabel = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row-reverse',
  gap: 14,
  fontFamily: "'Rubik', sans-serif",
  fontWeight: 400,
  fontStyle: 'normal',
  lineHeight: 1,
  letterSpacing: 0,
  textAlign: 'right',
  direction: 'rtl',
});

// ─── Funnel ───

const FunnelArea = styled('div')({
  width: '100%',
  zIndex: 3,
  position: 'relative',
});

const FunnelImg = styled('img')({
  width: '100%',
  display: 'block',
  marginBottom: -2,
  animation: `${fadeIn} 0.5s ease-out`,
});

const FunnelTrashLayer = styled('div')({
  position: 'absolute',
  inset: 0,
  zIndex: 4,
});

const FunnelTrashItem = styled('img')<{
  $top: number;
  $left: number;
  $width: string;
  $rotate: number;
  $z: number;
  $opacity: number;
}>(({ $top, $left, $width, $rotate, $z, $opacity }) => ({
  position: 'absolute',
  top: `${$top}%`,
  left: `${$left}%`,
  width: $width,
  maxWidth: 72,
  transform: `rotate(${$rotate}deg)`,
  zIndex: $z,
  userSelect: 'none',
  opacity: $opacity,
  willChange: 'top, left, opacity',
  transition: 'top 1s linear, left 1s linear, opacity 0.6s linear',
  cursor: 'pointer',
  pointerEvents: 'auto',
  outline: 'none',
  WebkitTapHighlightColor: 'transparent',
}));

// ─── Center Content ───

const ContentArea = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 20px',
  zIndex: 3,
  animation: `${fadeIn} 0.6s ease-out 0.15s both`,
});

const TitleText = styled('h2')({
  fontFamily: MISSION_FONT,
  color: MISSION_TEXT,
  fontSize: 'clamp(28px, 8vw, 40px)',
  fontWeight: 700,
  textAlign: 'center',
  direction: 'rtl',
  margin: 0,
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '100%',
  pointerEvents: 'none',
});

const DescBox = styled('div')({
  width: '90%',
  maxWidth: 380,
  padding: '20px 18px',
  marginTop: 20,
  borderRadius: 16,
  border: `2px solid ${MISSION_TEAL}`,
  backdropFilter: 'blur(12px)',
  background: 'rgba(255,255,255,0.12)',
  color: MISSION_TEXT,
  fontFamily: MISSION_FONT,
  fontSize: 'clamp(14px, 4vw, 17px)',
  lineHeight: 1.7,
  textAlign: 'center',
  direction: 'rtl',
  whiteSpace: 'pre-line',
});

const BinIconStatic = styled('img')({
  width: 130,
  maxWidth: 150,
  marginTop: -20,
  animation: `${fadeIn} 0.5s ease-out 0.3s both`,
});

// ─── Flying BinIcon (absolute positioned clone) ───

const FlyingBin = styled('img')({
  position: 'fixed',
  zIndex: 2,
  pointerEvents: 'none',
  willChange: 'transform, opacity, top, left, width',
});

// ─── Bottom Bins ───

const BinsRow = styled('div')({
  display: 'flex',
  direction: 'ltr',
  justifyContent: 'center',
  alignItems: 'flex-end',
  marginTop: 'auto',
  gap: 12,
  padding: '12px 16px 40px',
  marginBottom: -70,
  zIndex: 50,
  position: 'relative',
  animation: `${fadeIn} 0.5s ease-out 0.25s both`,
});

// Intro-only CTA — sits centered in the ContentArea, directly under the
// description box, replacing the bins+box that appear once the game starts.
const StartGameButton = styled('button')({
  background: '#39CABC',
  color: '#F2F7FF',
  border: 'none',
  borderRadius: 16,
  padding: '18px 64px',
  marginTop: 24,
  fontFamily: "'Rubik', sans-serif",
  fontSize: 'clamp(20px, 6vw, 28px)',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(57, 202, 188, 0.35)',
  transition: 'transform 0.15s, box-shadow 0.15s',
  WebkitTapHighlightColor: 'transparent',
  alignSelf: 'center',
  animation: `${fadeIn} 0.5s ease-out 0.25s both`,
  '&:active': { transform: 'scale(0.96)' },
});

const BinWrapper = styled('div')({
  width: '28%',
  maxWidth: 110,
  cursor: 'pointer',
  position: 'relative',
});

const BinImg = styled('img')({
  width: '100%',
  display: 'block',
});

// ─── Countdown Overlay ───

const CountdownOverlay = styled('div')({
  position: 'absolute',
  inset: 0,
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.55)',
  backdropFilter: 'blur(4px)',
});

const CountdownImg = styled('img')<{ $leaving?: boolean }>(({ $leaving }) => ({
  width: 'clamp(100px, 40vw, 180px)',
  animation: `${$leaving ? popOut : popIn} ${$leaving ? '0.25s' : '0.45s'} ease-out forwards`,
}));

const StartImg = styled('img')<{ $leaving?: boolean }>(({ $leaving }) => ({
  width: 'clamp(250px, 75vw, 450px)',
  animation: `${$leaving ? popOut : popIn} ${$leaving ? '0.25s' : '0.45s'} ease-out forwards`,
}));

// ─── Types & Data ───

// ─── Props ───

interface MissionTrashSortProps {
  score?: number;
  muted?: boolean;
  toggleMute?: () => void;
  startTrashBg?: () => void;
  stopTrashBg?: () => void;
  onLogout?: () => void;
  onHelp?: () => void;
  title?: string;
  description?: string;
  scoreLabel?: string;
  gameFinalText?: string;
  completeHeader?: string;
  completeButton?: string;
  badgeHeader?: string;
  badgeCurveText?: string;
  badgeAwardText?: string;
  badgeAchievementText?: string;
  shareButton?: string;
  continueButton?: string;
  startButton?: string;
  onContinue?: () => void;
  participantName?: string;
  activityCode?: string;
  onComplete?: (score: number) => void;
}

// Countdown steps: 3, 2, 1, "start!"
const COUNTDOWN_STEPS = [
  { src: '/images/countdown-1.svg', duration: 1100, isStart: false },
  { src: '/images/countdown-2.svg', duration: 1100, isStart: false },
  { src: '/images/countdown-3.svg', duration: 1100, isStart: false },
  { src: '/images/countdown-start.svg', duration: 1500, isStart: true },
];

const FUNNEL_TRASH_ITEMS = [
  { src: '/images/trash-items/apple.svg', top: '34%', left: '8%', width: '7%', rotate: -18, z: 2 },
  { src: '/images/trash-items/banana.svg', top: '6%', left: '30%', width: '20%', rotate: -28, z: 2 },
  { src: '/images/trash-items/box.svg', top: '10%', left: '77%', width: '30%', rotate: 10, z: 2 },
  { src: '/images/trash-items/bottle.svg', top: '12%', left: '12%', width: '25%', rotate: -90, z: 3 },
  { src: '/images/trash-items/paper.svg', top: '42%', left: '15%', width: '13%', rotate: 14, z: 3 },
  { src: '/images/trash-items/apple.svg', top: '0%', left: '56%', width: '12%', rotate: -5, z: 3 },
  { src: '/images/trash-items/banana.svg', top: '25%', left: '60%', width: '30%', rotate: -30, z: 3 },
  { src: '/images/trash-items/cans.svg', top: '35%', left: '26%', width: '14%', rotate: 7, z: 4 },
  { src: '/images/trash-items/box.svg', top: '30%', left: '40%', width: '30%', rotate: -14, z: 4 },
  { src: '/images/trash-items/bottle.svg', top: '35%', left: '68%', width: '25%', rotate: 50, z: 4 },
  { src: '/images/trash-items/paper.svg', top: '63%', left: '35%', width: '14%', rotate: -15, z: 4 },
  { src: '/images/trash-items/cans.svg', top: '45%', left: '50%', width: '15%', rotate: -120, z: 2 },
];

// ─── Flying Trash Item (animates to bin) ───

const FlyingTrashItem = styled('img')<{ $animate: boolean }>(({ $animate }) => ({
  position: 'fixed',
  zIndex: 20,
  pointerEvents: 'none',
  willChange: 'transform, opacity, top, left',
  transition: $animate ? 'top 0.6s cubic-bezier(0.25, 0.1, 0.25, 1), left 0.6s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.3s ease 0.4s, width 0.6s ease' : 'none',
}));

// ─── Item-to-bin mapping ───
const ITEM_BIN_MAP: Record<string, string> = {
  'apple': 'brown',
  'banana': 'brown',
  'cans': 'orange',
  'bottle': 'orange',
  'paper': 'blue',
  'box': 'blue',
};

const BIN_OPEN_IMAGES: Record<string, string> = {
  brown: '/images/bin-brown-open.svg',
  orange: '/images/bin-orange-open.svg',
  blue: '/images/bin-blue-open.svg',
};

const getItemName = (src: string): string => {
  const match = src.match(/trash-items\/(\w+)\.svg/);
  return match ? match[1] : '';
};

const TARGET_TOP_POINT = 65;
const TARGET_LEFT_POINT = 40;
const APPROACH_STEP_PER_SECOND = 2;
const FALL_PX_PER_TICK = 4; // ~160px/s at 50ms ticks
const CORRECT_BIN_SOUND_SRC = '/sounds/correct-bin-sound.wav';
const WRONG_BIN_SOUND_SRC = '/sounds/wrong-bin-sound.mp3';
const TOTAL_TRASH_ITEMS = FUNNEL_TRASH_ITEMS.length;
function userFingerprint(): string {
  try { return (localStorage.getItem('yooz_token') ?? '').slice(-10); } catch { return ''; }
}

const getTrashSortSessionKey = (activityCode?: string) => `mission_trash_sort_${activityCode || 'default'}_${userFingerprint()}`;
const toPercentNumber = (value: string) => Number.parseFloat(value.replace('%', '')) || 0;
const moveToward = (current: number, target: number, step: number) => {
  if (current < target) return Math.min(current + step, target);
  if (current > target) return Math.max(current - step, target);
  return current;
};

// ─── Component ───

export default function MissionTrashSort({
  score: initialScore = 0,
  muted = false,
  toggleMute,
  startTrashBg,
  stopTrashBg,
  title = 'איך משחקים?',
  description = 'עכשיו התמונה ברורה, אבל הזבל עדיין\nמסתיר את האות!\n\nליחצו על הפח הנכון עבור סוג\nהאשפה.',
  scoreLabel = 'ניקוד:',
  gameFinalText = 'כל הכבוד!',
  completeHeader = 'תודה!',
  completeButton = 'לקבלת תג',
  badgeHeader = 'תעלומת המזוודה הסודית',
  badgeCurveText = 'תג סוכן הפארק',
  badgeAwardText = 'מוענק בזאת',
  badgeAchievementText = 'על מציאת המזוודה והצלת הפארק!',
  shareButton = 'שתפו עם חברים',
  continueButton,
  startButton = 'קדימה!',
  onContinue,
  participantName,
  activityCode,
  onComplete,
  onLogout,
  onHelp,
}: MissionTrashSortProps) {
  type Phase = 'intro' | 'throwing' | 'countdown' | 'game' | 'complete' | 'badge';
  type ScoreFlash = 'positive' | 'negative' | null;
  type AnimatedTrashItem = {
    id: string;
    src: string;
    top: number;
    left: number;
    width: string;
    rotate: number;
    z: number;
    isVisible: boolean;
  };
  type FallingScreenItem = {
    id: string;
    src: string;
    x: number;   // viewport left px
    y: number;   // viewport top px
    width: number;
    rotate: number;
  };

  // Hide body background while this component is mounted
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#1a0a2e';
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  const [imagesReady, setImagesReady] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [badgeBlob, setBadgeBlob] = useState<Blob | null>(null);
  const [badgePreviewUrl, setBadgePreviewUrl] = useState<string | null>(null);

  const trackShareEvent = useCallback((event: 'click' | 'completed') => {
    if (!activityCode) return;
    fetch(`${API}/api/activities/${activityCode}/share-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
    }).catch(() => {});
  }, [activityCode]);

  const shareUrl = activityCode ? `${window.location.origin}/play/${activityCode}` : window.location.href;

  // Compose a full share image: background + badge + text
  const getBadgeBlob = useCallback(async (): Promise<Blob | null> => {
    if (badgeBlob) return badgeBlob;
    try {
      const loadImg = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject();
        img.src = src;
      });

      const [bgImg, badgeImg] = await Promise.all([
        loadImg('/images/mission-bg-1.svg'),
        loadImg('/images/badge.svg'),
      ]);

      const W = 600, H = 900;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      // Background
      ctx.drawImage(bgImg, 0, 0, W, H);

      // Dark overlay for readability
      ctx.fillStyle = 'rgba(10, 4, 30, 0.55)';
      ctx.fillRect(0, 0, W, H);

      // Teal frame border
      ctx.strokeStyle = '#39CABC';
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, W - 32, H - 32);

      // Badge title text (curved arc approximated as straight with letter spacing)
      ctx.save();
      ctx.font = 'bold 46px Rubik, Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 12;
      ctx.fillText(badgeCurveText, W / 2, 130);
      ctx.restore();

      // Badge image centered
      const badgeSize = 320;
      const badgeX = (W - badgeSize) / 2;
      const badgeY = 160;
      ctx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);

      // Award text box
      const boxX = 60, boxY = 530, boxW = W - 120, boxH = 130;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.strokeStyle = '#39CABC';
      ctx.lineWidth = 2;
      const r = 16;
      ctx.beginPath();
      ctx.moveTo(boxX + r, boxY);
      ctx.lineTo(boxX + boxW - r, boxY);
      ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
      ctx.lineTo(boxX + boxW, boxY + boxH - r);
      ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
      ctx.lineTo(boxX + r, boxY + boxH);
      ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
      ctx.lineTo(boxX, boxY + r);
      ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 6;
      ctx.font = '22px Rubik, Arial, sans-serif';
      ctx.fillStyle = '#F2F7FF';
      ctx.fillText(badgeAwardText, W / 2, boxY + 36);
      ctx.font = 'bold 22px Rubik, Arial, sans-serif';
      ctx.fillStyle = '#39CABC';
      ctx.fillText(participantName ?? '', W / 2, boxY + 68);
      ctx.font = '20px Rubik, Arial, sans-serif';
      ctx.fillStyle = '#F2F7FF';
      ctx.fillText(badgeAchievementText, W / 2, boxY + 104);
      ctx.restore();

      // Bottom URL hint
      ctx.save();
      ctx.font = '16px Rubik, Arial, sans-serif';
      ctx.fillStyle = 'rgba(242,247,255,0.5)';
      ctx.textAlign = 'center';
      ctx.fillText(shareUrl, W / 2, H - 28);
      ctx.restore();

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png'),
      );
      setBadgeBlob(blob);
      return blob;
    } catch {
      return null;
    }
  }, [badgeBlob, badgeCurveText, badgeAwardText, badgeAchievementText, participantName, shareUrl]);

  const handleShareClick = useCallback(async () => {
    trackShareEvent('click');
    const blob = await getBadgeBlob();
    const shareText = SHARE_MESSAGE_PREFIX + ' הזה';
    const shareTextWithUrl = buildSharePlainText(shareUrl);

    if (navigator.share) {
      const file = blob
        ? new File([blob], 'ganei-yehoshua.png', { type: 'image/png' })
        : undefined;
      const candidates: ShareData[] = [
        ...(file
          ? [
              { files: [file], text: shareText, url: shareUrl },
              { files: [file], text: shareTextWithUrl },
              { files: [file], text: shareText },
            ]
          : []),
        { text: shareText, url: shareUrl },
        { text: shareTextWithUrl },
        { url: shareUrl },
      ];

      for (const data of candidates) {
        if (navigator.canShare && !navigator.canShare(data)) continue;
        try {
          await navigator.share(data);
          trackShareEvent('completed');
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
        }
      }
    }

    if (blob) {
      const url = URL.createObjectURL(blob);
      setBadgePreviewUrl(url);
    }
    setShowShareModal(true);
  }, [trackShareEvent, getBadgeBlob, shareUrl]);

  const handleSocialShare = useCallback((platform: 'whatsapp' | 'facebook' | 'twitter') => {
    const plainText = buildSharePlainText(shareUrl);
    const encodedText = encodeURIComponent(plainText);
    let url = '';
    if (platform === 'whatsapp') url = `https://wa.me/?text=${encodedText}`;
    else if (platform === 'facebook') {
      openFacebookShare(shareUrl);
      trackShareEvent('completed');
      return;
    } else if (platform === 'twitter') {
      url = `https://twitter.com/intent/tweet?text=${encodedText}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    trackShareEvent('completed');
  }, [shareUrl, trackShareEvent]);

  const handleDownloadImage = useCallback(async () => {
    const blob = await getBadgeBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'badge.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    trackShareEvent('completed');
  }, [getBadgeBlob, trackShareEvent]);

  const handleCopyLink = useCallback(async () => {
    const plainText = buildSharePlainText(shareUrl);
    const html = buildShareHtml(shareUrl);
    try {
      if (typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
      setCopiedLink(true);
      trackShareEvent('completed');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      try {
        await navigator.clipboard.writeText(plainText);
        setCopiedLink(true);
        trackShareEvent('completed');
        setTimeout(() => setCopiedLink(false), 2000);
      } catch {
        // clipboard not available
      }
    }
  }, [shareUrl, trackShareEvent]);

  useEffect(() => {
    const srcs = [
      '/images/mission-bg-1.svg',
      '/images/mission-funnel.svg',
      '/images/bin-icon.svg',
      '/images/bin-orange.svg',
      '/images/bin-blue.svg',
      '/images/bin-brown.svg',
    ];
    let cancelled = false;
    Promise.all(
      srcs.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
          }),
      ),
    ).then(() => {
      if (!cancelled) setImagesReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  const [phase, setPhase] = useState<Phase>(() => {
    try {
      const raw = sessionStorage.getItem(getTrashSortSessionKey(activityCode));
      if (!raw) return 'intro';
      const data = JSON.parse(raw) as { phase?: string };
      const savedPhase = data.phase;
      // Active game → back to intro
      if (savedPhase === 'game' || savedPhase === 'throwing' || savedPhase === 'countdown') {
        return 'intro';
      }
      // Game finished → jump straight to badge (skip intermediate complete screen)
      if (savedPhase === 'complete') {
        return 'badge';
      }
      if (savedPhase === 'intro' || savedPhase === 'badge') {
        return savedPhase;
      }
    } catch {
      // ignore broken session data and start fresh
    }
    return 'intro';
  });
  const [blueBinOpen, setBlueBinOpen] = useState(false);
  const [countdownStep, setCountdownStep] = useState(0);
  const [stepLeaving, setStepLeaving] = useState(false);

  // Keep trash music disabled on final screens and active elsewhere.
  useEffect(() => {
    if (phase === 'complete' || phase === 'badge') {
      stopTrashBg?.();
      return;
    }
    startTrashBg?.();
  }, [phase, startTrashBg, stopTrashBg]);

  // Refs for measuring positions
  const binIconRef = useRef<HTMLImageElement>(null);
  const funnelAreaRef = useRef<HTMLDivElement>(null);
  const blueBinRef = useRef<HTMLDivElement>(null);
  const orangeBinRef = useRef<HTMLDivElement>(null);
  const brownBinRef = useRef<HTMLDivElement>(null);
  // Flying bin state
  const [flyStyle, setFlyStyle] = useState<React.CSSProperties | null>(null);
  const [showStaticBin, setShowStaticBin] = useState(true);

  // Game state
  const [gameScore, setGameScore] = useState(initialScore);

  // Save analytics when game ends — fire-and-forget, no navigation side-effects
  const analyticsSavedRef = useRef(false);
  useEffect(() => {
    if (phase !== 'complete' || analyticsSavedRef.current) return;
    analyticsSavedRef.current = true;
    if (activityCode) {
      fetch(`${API}/api/activities/${activityCode}/mission-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'trashsort_completed', score: gameScore }),
      }).catch(() => {});
    }
    onComplete?.(gameScore);
  }, [phase, gameScore, activityCode, onComplete]);
  const [, setSortedItemsCount] = useState(0);
  const [scoreFlash, setScoreFlash] = useState<ScoreFlash>(null);
  const scoreFlashTimerRef = useRef<number | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const finalizingTimerRef = useRef<number | null>(null);
  const [animatedTrashItems, setAnimatedTrashItems] = useState<AnimatedTrashItem[]>([]);
  const animatedTrashItemsRef = useRef<AnimatedTrashItem[]>([]);
  const [fallingScreenItems, setFallingScreenItems] = useState<FallingScreenItem[]>([]);
  const [openBinId, setOpenBinId] = useState<string | null>(null);
  const [flyingItem, setFlyingItem] = useState<{
    src: string;
    startTop: number;
    startLeft: number;
    startWidth: number;
    targetTop: number;
    targetLeft: number;
    targetWidth: number;
    animate: boolean;
  } | null>(null);

  const playFx = useCallback((src: string) => {
    if (muted) return;
    const audio = new Audio(src);
    audio.play().catch(() => {});
  }, [muted]);

  const triggerScoreFlash = useCallback((flash: Exclude<ScoreFlash, null>) => {
    setScoreFlash(flash);
    if (scoreFlashTimerRef.current) {
      window.clearTimeout(scoreFlashTimerRef.current);
    }
    scoreFlashTimerRef.current = window.setTimeout(() => {
      setScoreFlash(null);
      scoreFlashTimerRef.current = null;
    }, 1000);
  }, []);

  useEffect(() => () => {
    if (scoreFlashTimerRef.current) {
      window.clearTimeout(scoreFlashTimerRef.current);
    }
    if (finalizingTimerRef.current) {
      window.clearTimeout(finalizingTimerRef.current);
    }
  }, []);

  // Persist trash-sort internal station so refresh keeps current screen.
  useEffect(() => {
    sessionStorage.setItem(
      getTrashSortSessionKey(activityCode),
      JSON.stringify({ phase }),
    );
  }, [activityCode, phase]);

  // Intro CTA — bins and the small box are hidden on intro now; clicking
  // "קדימה!" skips the throwing animation and jumps straight to the countdown.
  const handleStartGame = useCallback(() => {
    if (phase !== 'intro') return;
    setPhase('countdown');
    setCountdownStep(0);
  }, [phase]);

  const handleBlueBinClick = useCallback(() => {
    if (phase !== 'intro') return;

    const iconEl = binIconRef.current;
    const binEl = blueBinRef.current;
    if (!iconEl || !binEl) return;

    const iconRect = iconEl.getBoundingClientRect();
    const binRect = binEl.getBoundingClientRect();

    setShowStaticBin(false);
    setFlyStyle({
      top: iconRect.top,
      left: iconRect.left,
      width: iconRect.width,
      height: iconRect.height,
      opacity: 1,
      transition: 'none',
    });

    setBlueBinOpen(true);
    setPhase('throwing');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const targetX = binRect.left + binRect.width / 2 - 10;
        const targetY = binRect.top + binRect.height * 0.55;
        setFlyStyle({
          top: targetY,
          left: targetX,
          width: 20,
          height: 20,
          opacity: 0,
          transition: 'all 1s cubic-bezier(0.25, 0.1, 0.25, 1)',
        });
      });
    });

    setTimeout(() => {
      setFlyStyle(null);
      setPhase('countdown');
      setCountdownStep(0);
    }, 1200);
  }, [phase]);

  // ─── Game phase: click on bin ───
  const handleGameBinClick = useCallback((binColor: string) => {
    if (phase !== 'game' || flyingItem || isFinalizing) return;

    // Active item is always the lowest currently falling item.
    const item = [...fallingScreenItems].sort((a, b) => b.y - a.y)[0];
    if (!item) return;

    const itemName = getItemName(item.src);
    const correctBin = ITEM_BIN_MAP[itemName];
    if (correctBin !== binColor) {
      playFx(WRONG_BIN_SOUND_SRC);
      setGameScore((prev) => prev - 1);
      triggerScoreFlash('negative');
      return;
    }
    playFx(CORRECT_BIN_SOUND_SRC);
    setGameScore((prev) => prev + 10);
    triggerScoreFlash('positive');

    const binRef = binColor === 'brown' ? brownBinRef : binColor === 'orange' ? orangeBinRef : blueBinRef;
    const binEl = binRef.current;
    if (!binEl) return;

    const binRect = binEl.getBoundingClientRect();

    const targetWidth = 30;
    setOpenBinId(binColor);
    setFallingScreenItems((prev) => prev.filter((i) => i.id !== item.id));

    setFlyingItem({
      src: item.src,
      startTop: item.y,
      startLeft: item.x,
      startWidth: item.width,
      // Aim to the top area of the selected bin.
      targetTop: binRect.top + 6,
      targetLeft: binRect.left + (binRect.width - targetWidth) / 2,
      targetWidth,
      animate: false,
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlyingItem((prev) => prev ? { ...prev, animate: true } : null);
      });
    });

    setTimeout(() => {
      setFlyingItem(null);
      setOpenBinId(null);
      setSortedItemsCount((prev) => {
        const next = prev + 1;
        if (prev < TOTAL_TRASH_ITEMS && next >= TOTAL_TRASH_ITEMS) {
          setIsFinalizing(true);
          finalizingTimerRef.current = window.setTimeout(() => {
            setPhase('complete');
          }, 5000);
        }
        return next;
      });
    }, 700);
  }, [phase, fallingScreenItems, flyingItem, isFinalizing, playFx, triggerScoreFlash]);

  // Countdown ticker
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownStep >= COUNTDOWN_STEPS.length) {
      setPhase('game');
      return;
    }
    const step = COUNTDOWN_STEPS[countdownStep];
    const leaveTime = step.duration - 300;
    const t1 = setTimeout(() => setStepLeaving(true), leaveTime);
    const t2 = setTimeout(() => {
      setStepLeaving(false);
      setCountdownStep((prev) => prev + 1);
    }, step.duration);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase, countdownStep]);

  // Keep animatedTrashItemsRef in sync to avoid stale closures in interval
  useEffect(() => {
    animatedTrashItemsRef.current = animatedTrashItems;
  }, [animatedTrashItems]);

  // Main game effect: items approach center, then graduate to screen-space falling
  useEffect(() => {
    if (phase !== 'game') {
      setSortedItemsCount(0);
      setIsFinalizing(false);
      if (finalizingTimerRef.current) {
        window.clearTimeout(finalizingTimerRef.current);
        finalizingTimerRef.current = null;
      }
      setAnimatedTrashItems([]);
      setFallingScreenItems([]);
      return;
    }

    const initialItems = FUNNEL_TRASH_ITEMS.map((item, index) => ({
      id: `${item.src}-${index}`,
      src: item.src,
      top: toPercentNumber(item.top),
      left: toPercentNumber(item.left),
      width: item.width,
      rotate: item.rotate,
      z: item.z,
      isVisible: true,
    }));
    setAnimatedTrashItems(initialItems);
    animatedTrashItemsRef.current = initialItems;

    // 1000ms tick: move items toward funnel center, graduate when reached
    const movementTick = window.setInterval(() => {
      const current = animatedTrashItemsRef.current;
      const funnelEl = funnelAreaRef.current;

      const toGraduate: AnimatedTrashItem[] = [];
      const remaining: AnimatedTrashItem[] = [];

      for (const item of current) {
        const nextTop = moveToward(item.top, TARGET_TOP_POINT, APPROACH_STEP_PER_SECOND);
        const nextLeft = moveToward(item.left, TARGET_LEFT_POINT, APPROACH_STEP_PER_SECOND);
        const reachedCenter = nextTop === TARGET_TOP_POINT && nextLeft === TARGET_LEFT_POINT;
        if (reachedCenter) {
          toGraduate.push({ ...item, top: nextTop, left: nextLeft });
        } else {
          remaining.push({ ...item, top: nextTop, left: nextLeft });
        }
      }

      setAnimatedTrashItems(remaining);
      animatedTrashItemsRef.current = remaining;

      if (toGraduate.length > 0 && funnelEl) {
        const rect = funnelEl.getBoundingClientRect();
        const newFalling: FallingScreenItem[] = toGraduate.map((item) => ({
          // Preserve the exact rendered top-left + rendered width to avoid a visual jump.
          width: Math.min((toPercentNumber(item.width) / 100) * rect.width, 72),
          id: item.id,
          src: item.src,
          x: rect.left + (item.left / 100) * rect.width,
          y: rect.top + (item.top / 100) * rect.height,
          rotate: item.rotate,
        }));
        setFallingScreenItems((prev) => [...prev, ...newFalling]);
      }
    }, 1000);

    // 50ms tick: move falling items down the screen in viewport pixels.
    // Items past the bottom are removed (no points) and counted toward
    // sortedItemsCount — otherwise the finish screen never triggers when an
    // item is missed, since only correct bin clicks bump that counter.
    const fallingTick = window.setInterval(() => {
      setFallingScreenItems((prev) => {
        if (prev.length === 0) return prev;
        const advanced = prev.map((item) => ({ ...item, y: item.y + FALL_PX_PER_TICK }));
        const remaining = advanced.filter((item) => item.y < window.innerHeight + 80);
        const missedCount = advanced.length - remaining.length;
        if (missedCount > 0) {
          setSortedItemsCount((prevCount) => {
            const next = prevCount + missedCount;
            if (prevCount < TOTAL_TRASH_ITEMS && next >= TOTAL_TRASH_ITEMS) {
              setIsFinalizing(true);
              finalizingTimerRef.current = window.setTimeout(() => {
                setPhase('complete');
              }, 5000);
            }
            return next;
          });
        }
        return remaining;
      });
    }, 50);

    return () => {
      window.clearInterval(movementTick);
      window.clearInterval(fallingTick);
    };
  }, [phase]);

  // ─── Wait for images before showing any phase ───
  if (!imagesReady && (phase === 'intro' || phase === 'throwing' || phase === 'countdown' || phase === 'game')) {
    return <PageWrapper />;
  }

  // ─── Game phase ───
  if (phase === 'game') {
    return (
      <PageWrapper>
        <TopBar>
          <ScoreBox $flash={scoreFlash}>
            <span>{scoreLabel}</span>
            <span>{gameScore}</span>
          </ScoreBox>
        </TopBar>
        <MissionTopMenu onLogout={onLogout} toggleMute={toggleMute} muted={muted} onHelp={onHelp} />

        <FunnelArea ref={funnelAreaRef}>
          <FunnelImg src="/images/mission-funnel.svg" alt="" />
          {isFinalizing && <TitleText>{gameFinalText}</TitleText>}
          <FunnelTrashLayer>
            {animatedTrashItems.map((item) => (
              <FunnelTrashItem
                key={item.id}
                src={item.src}
                alt=""
                $top={item.top}
                $left={item.left}
                $width={item.width}
                $rotate={item.rotate}
                $z={item.z}
                $opacity={item.isVisible ? 1 : 0}
              />
            ))}
          </FunnelTrashLayer>
        </FunnelArea>

        <ContentArea style={{ flex: 1 }} />

        {/* Items falling in screen-space (fixed position) */}
        {fallingScreenItems.map((item) => (
          <img
            key={item.id}
            src={item.src}
            alt=""
            style={{
              position: 'fixed',
              top: item.y,
              left: item.x,
              width: item.width,
              transform: `rotate(${item.rotate}deg)`,
              zIndex: 10,
              cursor: 'pointer',
              userSelect: 'none',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          />
        ))}

        {/* Flying trash item animation */}
        {flyingItem && (
          <FlyingTrashItem
            src={flyingItem.src}
            alt=""
            $animate={flyingItem.animate}
            style={{
              top: flyingItem.animate ? flyingItem.targetTop : flyingItem.startTop,
              left: flyingItem.animate ? flyingItem.targetLeft : flyingItem.startLeft,
              width: flyingItem.animate ? flyingItem.targetWidth : flyingItem.startWidth,
              opacity: flyingItem.animate ? 0 : 1,
            }}
          />
        )}

        <BinsRow>
          <BinWrapper ref={orangeBinRef} onClick={() => handleGameBinClick('orange')}>
            <BinImg
              src={openBinId === 'orange' ? BIN_OPEN_IMAGES.orange : '/images/bin-orange.svg'}
              alt="אריזות"
            />
          </BinWrapper>
          <BinWrapper ref={blueBinRef} onClick={() => handleGameBinClick('blue')}>
            <BinImg
              src={openBinId === 'blue' ? BIN_OPEN_IMAGES.blue : '/images/bin-blue.svg'}
              alt="נייר"
            />
          </BinWrapper>
          <BinWrapper ref={brownBinRef} onClick={() => handleGameBinClick('brown')}>
            <BinImg
              src={openBinId === 'brown' ? BIN_OPEN_IMAGES.brown : '/images/bin-brown.svg'}
              alt="אורגני"
            />
          </BinWrapper>
        </BinsRow>
      </PageWrapper>
    );
  }

  // ─── Completion phase ───
  if (phase === 'complete') {
    return (
      <MissionWrapper bg={undefined} step={1}>
        <FrameContainer style={{ background: 'transparent', backgroundImage: 'none' }}>
          {/* Background video — fills the whole frame, mission-frame.svg sits on top */}
          <video
            src="/videos/env-finish-video.mp4"
            autoPlay
            loop
            playsInline
            muted
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 0,
            }}
          />
          <img
            src="/images/mission-frame.svg"
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'bottom center',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />
          <FrameHeaderOverlay src="/images/mission-header.svg" alt="" style={{ zIndex: 2 }} />
          <FrameFooterOverlay src="/images/mission-footer.svg" alt="" style={{ zIndex: 2 }} />

          <MissionTopMenu onLogout={onLogout} toggleMute={toggleMute} muted={muted} onHelp={onHelp} />

          <MissionHeader>
            <HeaderText>{completeHeader}</HeaderText>
          </MissionHeader>

          <MissionContent />

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <MissionButton step={3} onClick={() => setPhase('badge')}>
              {completeButton}
            </MissionButton>
          </div>
        </FrameContainer>
      </MissionWrapper>
    );
  }

  // ─── Badge phase ───
  if (phase === 'badge') {
    const badgeName = participantName?.trim() || 'למשתתף/ת';
    return (
      <>
      <MissionWrapper bg="/images/mission-bg-1.svg" step={0}>
        <FrameContainer>
          <MissionTopMenu onLogout={onLogout} toggleMute={toggleMute} muted={muted} onHelp={onHelp} />

          <MissionHeader>
            <HeaderText>{badgeHeader}</HeaderText>
          </MissionHeader>

          <MissionContent style={{ paddingTop: 40 }}>
            <svg
              viewBox="0 0 300 80"
              style={{ width: '80%', maxWidth: 300, overflow: 'visible', marginTop: 50, marginBottom: -50 }}
            >
              <defs>
                <path id="badge-curve" d="M 15,75 A 150,150 0 0,1 285,75" fill="none" />
              </defs>
              <text
                fill="#fff"
                fontSize="48"
                fontWeight="900"
                fontFamily={MISSION_FONT}
                letterSpacing="2"
                direction="ltr"
                unicodeBidi="bidi-override"
                style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.7))' }}
              >
                <textPath href="#badge-curve" startOffset="50%" textAnchor="middle">
                  {textForSvgTextPath(badgeCurveText)}
                </textPath>
              </text>
            </svg>
            <img
              src="/images/badge.svg"
              alt="badge"
              style={{ width: '60%', maxWidth: 240, objectFit: 'contain' }}
            />
            <div
              style={{
                color: MISSION_TEXT,
                fontFamily: MISSION_FONT,
                textAlign: 'center',
                direction: 'rtl',
                lineHeight: 1.6,
                fontSize: 'clamp(14px, 4vw, 18px)',
                border: `1.5px solid ${MISSION_TEAL}`,
                borderRadius: 16,
                background: 'rgba(0,0,0,0.35)',
                padding: '12px 20px',
                width: '85%',
              }}
            >
              <div>{badgeAwardText}</div>
              <div style={{ color: MISSION_TEAL }}>{badgeName}</div>
              <div>{badgeAchievementText}</div>
            </div>
          </MissionContent>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <MissionButton step={0} onClick={handleShareClick}>
              <ShareButtonLabel>
                {shareButton}
                <svg width="20" height="20" viewBox="0 0 75 75" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12.3698 49.9488C5.48028 49.9488 0 44.4686 0 37.5791C0 30.6896 5.48028 25.2093 12.3698 25.2093C19.2593 25.2093 24.7396 30.6896 24.7396 37.5791C24.7396 44.312 19.2593 49.9488 12.3698 49.9488ZM12.3698 29.7501C8.14213 29.7501 4.69738 33.1948 4.69738 37.4225C4.69738 41.6501 8.14213 45.0949 12.3698 45.0949C16.5974 45.0949 20.0422 41.6501 20.0422 37.4225C20.0422 33.3514 16.5974 29.7501 12.3698 29.7501ZM62.6318 24.7396C55.7423 24.7396 50.262 19.2593 50.262 12.3698C50.262 5.48028 55.7423 0 62.6318 0C69.5213 0 75.0016 5.48028 75.0016 12.3698C75.0016 19.2593 69.3647 24.7396 62.6318 24.7396ZM62.6318 4.69738C58.4041 4.69738 54.9594 8.14213 54.9594 12.3698C54.9594 16.5974 58.4041 20.0422 62.6318 20.0422C66.8594 20.0422 70.3042 16.5974 70.3042 12.3698C70.3042 8.14213 66.8594 4.69738 62.6318 4.69738ZM62.6318 75.0016C55.7423 75.0016 50.262 69.5213 50.262 62.6318C50.262 55.7423 55.7423 50.262 62.6318 50.262C69.5213 50.262 75.0016 55.7423 75.0016 62.6318C75.0016 69.5213 69.3647 75.0016 62.6318 75.0016ZM62.6318 54.9594C58.4041 54.9594 54.9594 58.4041 54.9594 62.6318C54.9594 66.8594 58.4041 70.3042 62.6318 70.3042C66.8594 70.3042 70.3042 66.8594 70.3042 62.6318C70.3042 58.4041 66.8594 54.9594 62.6318 54.9594Z" fill="#F4FBFF" />
                  <path d="M52.4539 60.436L20.1985 44.3084L22.3906 39.7676L54.8026 55.8952L52.4539 60.436ZM22.3906 35.2268L20.1985 30.8425L52.4539 14.7148L54.8026 19.0991L22.3906 35.2268Z" fill="#F4FBFF" />
                </svg>
              </ShareButtonLabel>
            </MissionButton>
          </div>
        </FrameContainer>
      </MissionWrapper>

      {/* Share modal (desktop fallback) */}
      {showShareModal && (
        <ShareModalOverlay onClick={() => setShowShareModal(false)}>
          <ShareModalBox onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, textAlign: 'center' }}>
              {shareButton}
            </div>

            <p
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                textAlign: 'center',
                direction: 'rtl',
                color: MISSION_TEXT,
                margin: 0,
              }}
            >
              {SHARE_MESSAGE_PREFIX}{' '}
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: MISSION_TEAL, textDecoration: 'underline' }}
              >
                הזה
              </a>
            </p>

            {/* Badge image preview */}
            {badgePreviewUrl && (
              <img
                src={badgePreviewUrl}
                alt="badge preview"
                style={{ width: '100%', borderRadius: 10, objectFit: 'cover' }}
              />
            )}

            {/* Download image button */}
            <ShareCopyBtn
              onClick={handleDownloadImage}
              style={{ width: '100%', padding: '9px 0', fontSize: 13 }}
            >
              ⬇ שמור תמונה
            </ShareCopyBtn>

            <div style={{ fontSize: 11, color: 'rgba(242,247,255,0.5)', textAlign: 'center' }}>
              שתפו את ההודעה והתמונה
            </div>
            <ShareOptionRow>
              <ShareOption onClick={() => handleSocialShare('whatsapp')}>
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="16" fill="#25D366"/>
                  <path d="M22.5 9.5A9.1 9.1 0 0 0 7.1 20.3L6 26l5.9-1.5A9.1 9.1 0 0 0 22.5 9.5zm-6.5 14a7.5 7.5 0 0 1-3.8-1l-.3-.2-3.1.8.8-3-.2-.3a7.5 7.5 0 1 1 6.6 3.7zm4.1-5.6c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.8.9-.1.2-.3.2-.5.1a6.3 6.3 0 0 1-3-2.6c-.2-.4.2-.4.6-1.2.1-.2 0-.3-.1-.5l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.7 4.3 3.8.6.3 1.1.4 1.4.5.6.2 1.2.1 1.6-.1.5-.3 1.3-.5 1.5-1s.2-.9.1-1c-.1-.1-.3-.2-.5-.3z" fill="#fff"/>
                </svg>
                WhatsApp
              </ShareOption>
              <ShareOption onClick={() => handleSocialShare('facebook')}>
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="16" fill="#1877F2"/>
                  <path d="M21 16h-3v10h-4V16h-2v-4h2v-2c0-2.5 1.5-4 4-4h3v4h-2c-.6 0-1 .4-1 1v1h3l-.5 4z" fill="#fff"/>
                </svg>
                Facebook
              </ShareOption>
              <ShareOption onClick={() => handleSocialShare('twitter')}>
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="16" fill="#000"/>
                  <path d="M17.8 14.8 23.2 8h-1.3l-4.7 5.5L13 8H8l5.6 8.2L8 24h1.3l4.9-5.7 3.9 5.7H23L17.8 14.8zm-1.7 2-.6-.8-4.6-6.6h2l3.7 5.3.6.8 4.8 6.9h-2l-3.9-5.6z" fill="#fff"/>
                </svg>
                X / Twitter
              </ShareOption>
            </ShareOptionRow>
            <ShareCopyRow>
              <ShareLinkInput readOnly value={buildSharePlainText(shareUrl)} />
              <ShareCopyBtn onClick={handleCopyLink}>
                {copiedLink ? '✓ הועתק' : 'העתק'}
              </ShareCopyBtn>
            </ShareCopyRow>
            <ShareCloseBtn onClick={() => setShowShareModal(false)}>סגור</ShareCloseBtn>
          </ShareModalBox>
        </ShareModalOverlay>
      )}
      </>
    );
  }

  // ─── Intro / Throwing / Countdown phases ───

  const showCountdownOverlay = phase === 'countdown' && countdownStep < COUNTDOWN_STEPS.length;
  const currentStep = showCountdownOverlay ? COUNTDOWN_STEPS[countdownStep] : null;

  return (
    <PageWrapper>
      {/* Flying bin clone */}
      {flyStyle && (
        <FlyingBin src="/images/bin-icon.svg" alt="" style={flyStyle} />
      )}

      {/* Countdown overlay */}
      {showCountdownOverlay && currentStep && (
        <CountdownOverlay>
          {currentStep.isStart ? (
            <StartImg src={currentStep.src} alt="start" $leaving={stepLeaving} />
          ) : (
            <CountdownImg src={currentStep.src} alt="" $leaving={stepLeaving} />
          )}
        </CountdownOverlay>
      )}

      {/* Top bar: score only — info menu floats top-right via MissionTopMenu */}
      <TopBar>
        <ScoreBox $flash={scoreFlash}>
          <span>{scoreLabel}</span>
          <span>{gameScore}</span>
        </ScoreBox>
      </TopBar>
      <MissionTopMenu onLogout={onLogout} toggleMute={toggleMute} muted={muted} onHelp={onHelp} />

      <FunnelArea>
        <FunnelImg src="/images/mission-funnel.svg" alt="" />
        <TitleText>{title}</TitleText>
      </FunnelArea>

      <ContentArea>
        <DescBox>{description}</DescBox>
        {phase === 'intro' && (
          <StartGameButton onClick={handleStartGame}>{startButton}</StartGameButton>
        )}
        <BinIconStatic
          ref={binIconRef}
          src="/images/bin-icon.svg"
          alt=""
          style={{ visibility: showStaticBin && phase === 'throwing' ? 'visible' : 'hidden' }}
        />
      </ContentArea>

      {phase !== 'intro' && (
        <BinsRow>
          <BinWrapper>
            <BinImg src="/images/bin-orange.svg" alt="אריזות" />
          </BinWrapper>
          <BinWrapper ref={blueBinRef} onClick={handleBlueBinClick}>
            <BinImg
              src={blueBinOpen ? '/images/bin-blue-open.svg' : '/images/bin-blue.svg'}
              alt="נייר"
            />
          </BinWrapper>
          <BinWrapper>
            <BinImg src="/images/bin-brown.svg" alt="אורגני" />
          </BinWrapper>
        </BinsRow>
      )}
    </PageWrapper>
  );
}
