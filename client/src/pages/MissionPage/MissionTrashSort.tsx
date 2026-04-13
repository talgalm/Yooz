import { useState, useEffect, useRef, useCallback } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import {
  MissionWrapper,
  FrameContainer,
  FrameHeaderOverlay,
  FrameFooterOverlay,
  MissionHeader,
  HeaderText,
  MissionContent,
  MissionButton,
  TopIconButton,
  TopActionRow,
} from './MissionFrame';

// ─── Design tokens ───
const MISSION_FONT = "'Rubik', sans-serif";
const MISSION_TEXT = '#F2F7FF';
const MISSION_TEAL = '#39CABC';

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
  justifyContent: 'space-between',
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

const MuteBtn = styled('button')({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0.85,
  transition: 'opacity 0.2s',
  position: 'relative',
  '&:hover': { opacity: 1 },
});

const MuteIcon = styled('img')<{ $muted: boolean }>(({ $muted }) => ({
  width: 28,
  height: 28,
  filter: $muted ? 'grayscale(1) brightness(0.5)' : 'brightness(1)',
  transition: 'filter 0.2s',
}));

const MuteSlash = styled('div')({
  position: 'absolute',
  width: 3,
  height: 32,
  background: '#ff4444',
  borderRadius: 2,
  transform: 'rotate(45deg)',
  pointerEvents: 'none',
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
  fontSize: 'clamp(22px, 6vw, 30px)',
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
  participantName,
  activityCode,
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
        if (next >= TOTAL_TRASH_ITEMS) {
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

    // 50ms tick: move falling items down the screen in viewport pixels
    const fallingTick = window.setInterval(() => {
      setFallingScreenItems((prev) => {
        if (prev.length === 0) return prev;
        return prev
          .map((item) => ({ ...item, y: item.y + FALL_PX_PER_TICK }))
          .filter((item) => item.y < window.innerHeight + 80);
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
          <div style={{ display: 'flex', gap: 6 }}>
            {onLogout && (
              <TopIconButton onClick={onLogout} aria-label="Logout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </TopIconButton>
            )}
            {toggleMute && (
              <TopIconButton onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
                {muted ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                )}
              </TopIconButton>
            )}
            {onHelp && (
              <TopIconButton onClick={onHelp} aria-label="Help">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </TopIconButton>
            )}
          </div>
        </TopBar>

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
        <FrameContainer style={{ background: '#1a0a2e' }}>
          <FrameHeaderOverlay src="/images/mission-header.svg" alt="" />
          <FrameFooterOverlay src="/images/mission-footer.svg" alt="" />

          <TopActionRow>
            {onLogout && (
              <TopIconButton onClick={onLogout} aria-label="Logout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </TopIconButton>
            )}
            {toggleMute && (
              <TopIconButton onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
                {muted ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                )}
              </TopIconButton>
            )}
            {onHelp && (
              <TopIconButton onClick={onHelp} aria-label="Help">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </TopIconButton>
            )}
          </TopActionRow>

          <MissionHeader>
            <HeaderText>{completeHeader}</HeaderText>
          </MissionHeader>

          <MissionContent style={{ padding: 0, gap: 0, justifyContent: 'center', minHeight: 0, overflow: 'hidden' }}>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                width: '100%',
                maxHeight: '52dvh',
                aspectRatio: '3 / 4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderRadius: 8,
                transform: 'translateY(-23px)',
              }}
            >
              <video
                src="/videos/env-finish-video.mp4"
                autoPlay
                loop
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 30%',
                  display: 'block',
                }}
              />
            </div>
          </MissionContent>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 70 }}>
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
      <MissionWrapper bg="/images/mission-bg-1.svg" step={0}>
        <FrameContainer>
          <TopActionRow>
            {onLogout && (
              <TopIconButton onClick={onLogout} aria-label="Logout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </TopIconButton>
            )}
            {toggleMute && (
              <TopIconButton onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
                {muted ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                )}
              </TopIconButton>
            )}
            {onHelp && (
              <TopIconButton onClick={onHelp} aria-label="Help">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </TopIconButton>
            )}
          </TopActionRow>

          <MissionHeader>
            <HeaderText>{badgeHeader}</HeaderText>
          </MissionHeader>

          <MissionContent style={{ paddingTop: 40 }}>
            <svg
              viewBox="0 0 300 80"
              style={{ width: '80%', maxWidth: 300, overflow: 'visible', marginBottom: -50 }}
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
                style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.7))' }}
              >
                <textPath href="#badge-curve" startOffset="50%" textAnchor="middle">
                  {badgeCurveText}
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

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: -24 }}>
            <MissionButton step={0} onClick={() => {}}>
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

      {/* Top bar: score + mute */}
      <TopBar>
        <ScoreBox $flash={scoreFlash}>
          <span>{scoreLabel}</span>
          <span>{gameScore}</span>
        </ScoreBox>
        <div style={{ display: 'flex', gap: 6 }}>
          {onLogout && (
            <TopIconButton onClick={onLogout} aria-label="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </TopIconButton>
          )}
          {toggleMute && (
            <TopIconButton onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </TopIconButton>
          )}
          {onHelp && (
            <TopIconButton onClick={onHelp} aria-label="Help">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </TopIconButton>
          )}
        </div>
      </TopBar>

      <FunnelArea>
        <FunnelImg src="/images/mission-funnel.svg" alt="" />
        <TitleText>{title}</TitleText>
      </FunnelArea>

      <ContentArea>
        <DescBox>{description}</DescBox>
        <BinIconStatic
          ref={binIconRef}
          src="/images/bin-icon.svg"
          alt=""
          style={{ visibility: showStaticBin && phase === 'intro' ? 'visible' : 'hidden' }}
        />
      </ContentArea>

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
    </PageWrapper>
  );
}
