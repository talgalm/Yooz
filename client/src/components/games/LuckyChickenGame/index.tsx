import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from '../../../context/LanguageContext';
import { useGameSounds } from '../../../hooks/useGameSounds';
import {
  useActivityPlayingHeaderHostActive,
  useRegisterActivityGameHeader,
  type ActivityGameHeaderPhase,
} from '../../../context/activityPlayingHeaderContext';
import { texts } from './LuckyChickenGame.i18n';
import type { GameProps } from '../types';
import {
  GameRoot,
  GameBg,
  HudBar,
  HudBarSvg,
  LogoImg,
  HudOverlay,
  HudSection,
  HudLabel,
  HudValue,
  HudComboSection,
  HudComboValue,
  LivesRow,
  HeartEl,
  GameField,
  FallingItemWrapper,
  FallingItemImg,
  CaughtItemWrapper,
  ScorePopupEl,
  BucketEl,
  HotStreakOverlay,
  SunburstRays,
  ShootingBeams,
  SunburstGlow,
  Sparkle,
  HotStreakImg,
  VignetteFlash,
  StartOverlay,
  FailOverlay,
  ResultOverlay,
  MascotImg,
  BurntFailImg,
  OverlayTitle,
  ScorePanel,
  ScorePanelLabel,
  ScorePanelValue,
  ScorePanelSub,
  GoldButton,
  GoldButtonBg,
  GoldButtonText,
  PauseHit,
  PauseOverlay,
  PauseTitle,
  QuitButton,
  StartLogo,
  StartTitle,
  StartDesc,
  InstructionsOverlay,
  InstrBlock,
  InstrHeading,
  InstrItems,
  InstrItemImg,
  InstrHint,
  RankBadge,
  RankLabel,
  RankValue,
} from './styled';

type RankKey = 'rankRookie' | 'rankHunter' | 'rankMaster' | 'rankLegend';
function rankKey(score: number): RankKey {
  if (score < 1000) return 'rankRookie';
  if (score < 3000) return 'rankHunter';
  if (score < 6000) return 'rankMaster';
  return 'rankLegend';
}

// ── Assets ────────────────────────────────────────────────────────────────────

const LC = (f: string) => `/images/lucky-chicken/${f}`;

const BG_IMG          = LC('3f194707-08f4-4524-8bb6-f6ae6b68f7cd.svg');
const LOGO_IMG        = LC('luckychicken-logo-gold.png');
const MASCOT_IMG      = LC('b95d2929-be1f-4bf3-82de-9adcc5fe482b.svg');
const BUCKET_IMG      = LC('817a72bf-5e18-4a8e-9e41-05cc60664d73.svg');
const HOT_STREAK_IMG  = LC('bbd77ff3-5ecc-4a4b-9007-7cb1ae35a29e.svg');
const OOPS_IMG        = LC('3e0c9351-3d3d-48a7-a45d-50c6bf4d2537.svg');
const WELL_DONE_IMG   = LC('cd259949-f86e-4929-a31e-0294b3d2c345.svg');
const BURNT_FAIL_IMG  = LC('bdedfe51-0c86-4634-923a-a1b6195a2f90.svg');
const GOLD_BUTTON_IMG = LC('bde31a22-79d3-4db8-a6b4-0bef18d7d164.svg');

type ItemEffect = 'combo' | 'slow';
interface ItemDef {
  kind: string;
  src: string;
  good: boolean;
  points: number;   // good: awarded; bad: shown as penalty in instructions
  effect?: ItemEffect;
  weight: number;   // spawn likelihood within its (good/bad) pool
}

const ITEM_DEFS: ItemDef[] = [
  { kind: 'crispy', src: LC('70c36d88-b6d7-48ef-aeaa-ce060cec82b8.svg'), good: true,  points: 100, weight: 5 },
  { kind: 'crispy', src: LC('8a7fcd66-0f22-4743-ae02-fe78ec740ca9.svg'), good: true,  points: 100, weight: 5 },
  { kind: 'spicy',  src: LC('83487a97-92a9-4f85-8ad8-1a3a4210e5c8.svg'), good: true,  points: 150, weight: 4 },
  { kind: 'corn',   src: LC('item-corn.svg'),                            good: true,  points: 80,  weight: 3 },
  { kind: 'lemon',  src: LC('item-lemon.svg'),  good: true,  points: 50, effect: 'combo', weight: 2 },
  { kind: 'celery', src: LC('item-celery.svg'), good: true,  points: 50, effect: 'slow',  weight: 1.6 },
  { kind: 'burnt',  src: LC('64b12ccc-c8e0-49aa-97fe-d0a1ed8fdca3.svg'), good: false, points: 150, weight: 5 },
  { kind: 'bone',   src: LC('item-bone.svg'),  good: false, points: 100, weight: 3 },
  { kind: 'chili',  src: LC('item-chili.svg'), good: false, points: 0,   weight: 2 },
];
const GOOD_DEFS = ITEM_DEFS.filter(d => d.good);
const BAD_DEFS  = ITEM_DEFS.filter(d => !d.good);

function pickWeighted(defs: ItemDef[]): ItemDef {
  const total = defs.reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * total;
  for (const d of defs) { r -= d.weight; if (r <= 0) return d; }
  return defs[defs.length - 1];
}

// Distinct items for the instructions screen
const CATCH_ITEMS = [
  ITEM_DEFS.find(d => d.kind === 'crispy')!,
  ITEM_DEFS.find(d => d.kind === 'spicy')!,
  ITEM_DEFS.find(d => d.kind === 'corn')!,
  ITEM_DEFS.find(d => d.kind === 'lemon')!,
  ITEM_DEFS.find(d => d.kind === 'celery')!,
];
const AVOID_ITEMS = BAD_DEFS;

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'start' | 'instructions' | 'playing' | 'fail' | 'result';

interface FallingItem {
  id: string;
  src: string;
  isGood: boolean;
  kind: string;
  points: number;
  effect?: ItemEffect;
  x: number;
  fallDuration: number;
  rotation: number;
  spawnedAt: number;
}

interface CaughtAnim {
  id: string;
  src: string;
  x: number;
  y: number; // % from top of GameField at moment of catch
}

interface ScorePopup {
  id: string;
  x: number;
  y: number;
  text: string;
  good: boolean;
}

interface Flash {
  id: string;
  color: string;
}

interface LuckyChickenSettings {
  durationSeconds?: number;
  pointsPerCatch?: number;
  badItemChance?: number;
  spawnIntervalMs?: number;
  fallDurationMin?: number;
  fallDurationMax?: number;
  maxLives?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_DURATION   = 75;
const DEFAULT_POINTS     = 10;
const DEFAULT_BAD_CHANCE = 0.22;
const DEFAULT_SPAWN_MS   = 900;
const DEFAULT_FALL_MIN   = 2800;
const DEFAULT_FALL_MAX   = 5200;
const DEFAULT_MAX_LIVES  = 3;
const HOT_STREAK_AT      = 5;

// fallAnim: top goes -15% → 112% (127pp range).
// Bucket (bottom:-8%) rim is ~68% from GameField top.
// Item is 92px; center = top + 46px.  For center@68%: itemTop = 68 - 46/H*100.
// On a ~750px GameField: 68 - 6.1 = 61.9% → progress = (61.9+15)/127 ≈ 0.605
// We catch slightly before the visual rim so items look like they enter the bucket.
const CATCH_PROGRESS_START = 0.67;
const CATCH_PROGRESS_END   = 0.78;
const CATCH_X_RADIUS       = 22;

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// progress → visual top% in GameField
function progressToTopPct(p: number) { return -15 + p * 127; }

let uid = 0;
const nextId = () => `lc_${++uid}`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function LuckyChickenGame({ game, onComplete }: GameProps) {
  const settings  = game.settings as unknown as LuckyChickenSettings;
  const duration  = settings.durationSeconds  ?? DEFAULT_DURATION;
  const points    = settings.pointsPerCatch   ?? DEFAULT_POINTS;
  const badChance = settings.badItemChance    ?? DEFAULT_BAD_CHANCE;
  const spawnMs   = settings.spawnIntervalMs  ?? DEFAULT_SPAWN_MS;
  const fallMin   = settings.fallDurationMin  ?? DEFAULT_FALL_MIN;
  const fallMax   = settings.fallDurationMax  ?? DEFAULT_FALL_MAX;
  const maxLives  = settings.maxLives         ?? DEFAULT_MAX_LIVES;

  const t      = useTranslations(texts);
  const sounds = useGameSounds();

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase,       setPhase]       = useState<Phase>('start');
  const [score,       setScore]       = useState(0);
  const [combo,       setCombo]       = useState(0);
  const [bestCombo,   setBestCombo]   = useState(0);
  const [lives,       setLives]       = useState(maxLives);
  const [timeLeft,    setTimeLeft]    = useState(duration);
  const [items,       setItems]       = useState<FallingItem[]>([]);
  const [caughtAnims, setCaughtAnims] = useState<CaughtAnim[]>([]);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const [flashes,     setFlashes]     = useState<Flash[]>([]);
  const [vignetteKey, setVignetteKey] = useState(0);
  const [streakKey,   setStreakKey]   = useState(0);
  const [comboKey,    setComboKey]    = useState(0);
  const [showStreak,  setShowStreak]  = useState(false);
  const [paused,      setPaused]      = useState(false);
  // Per-heart animation keys (increment when that heart is lost)
  const [heartKeys,   setHeartKeys]   = useState<number[]>(() => Array(DEFAULT_MAX_LIVES).fill(0));

  // ── Refs ───────────────────────────────────────────────────────────────────
  const phaseRef       = useRef<Phase>('start');
  const pausedRef      = useRef(false);
  const pauseStartRef  = useRef(0);
  const slowUntilRef   = useRef(0);
  const bucketXRef     = useRef(50);
  const livesRef       = useRef(maxLives);
  const comboRef       = useRef(0);
  const scoreRef       = useRef(0);
  const bestComboRef   = useRef(0);
  const itemsRef       = useRef<FallingItem[]>([]);
  const startTimeRef   = useRef(0);
  const gameRootRef    = useRef<HTMLDivElement | null>(null);
  const gameFieldRef   = useRef<HTMLDivElement | null>(null);
  const bucketRef      = useRef<HTMLImageElement | null>(null);
  const lastPtrXRef    = useRef(50);
  const tiltResetRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streakTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spawnTimer     = useRef<number | null>(null);
  const timerInterval  = useRef<number | null>(null);
  const collInterval   = useRef<number | null>(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Activity header ────────────────────────────────────────────────────────
  const activityHeaderAudio = useActivityPlayingHeaderHostActive();
  const headerPhase: ActivityGameHeaderPhase =
    phase === 'result' ? 'finish'
      : (phase === 'start' || phase === 'instructions') ? 'intro'
      : 'playing';
  useRegisterActivityGameHeader(activityHeaderAudio, headerPhase, sounds.isMuted, sounds.toggleMute);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    if (spawnTimer.current)    { clearInterval(spawnTimer.current);    spawnTimer.current    = null; }
    if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
    if (collInterval.current)  { clearInterval(collInterval.current);  collInterval.current  = null; }
    if (streakTimeout.current) { clearTimeout(streakTimeout.current);  streakTimeout.current = null; }
    if (tiltResetRef.current)  { clearTimeout(tiltResetRef.current);   tiltResetRef.current  = null; }
  }, []);


  // ── Flash helper ───────────────────────────────────────────────────────────
  const triggerFlash = useCallback((color: string) => {
    const id = nextId();
    setFlashes(prev => [...prev, { id, color }]);
    setTimeout(() => setFlashes(prev => prev.filter(f => f.id !== id)), 500);
  }, []);

  // ── Score popup helper ─────────────────────────────────────────────────────
  const addPopup = useCallback((x: number, y: number, text: string, good: boolean) => {
    const id = nextId();
    setScorePopups(prev => [...prev, { id, x, y, text, good }]);
    setTimeout(() => setScorePopups(prev => prev.filter(p => p.id !== id)), 850);
  }, []);

  // ── Start / restart ────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    clearAll();
    phaseRef.current   = 'playing';
    pausedRef.current  = false;
    setPaused(false);
    slowUntilRef.current = 0;
    bucketXRef.current = 50;
    livesRef.current   = maxLives;
    comboRef.current   = 0;
    scoreRef.current   = 0;
    bestComboRef.current = 0;
    itemsRef.current   = [];
    lastPtrXRef.current = 50;

    setPhase('playing');
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setLives(maxLives);
    setHeartKeys(Array(maxLives).fill(0));
    setTimeLeft(duration);
    setItems([]);
    setCaughtAnims([]);
    setScorePopups([]);
    setFlashes([]);
    setShowStreak(false);
    startTimeRef.current = Date.now();
    sounds.startBgMusic();

    if (bucketRef.current) {
      bucketRef.current.style.transition = 'none';
      bucketRef.current.style.left = '50%';
      bucketRef.current.style.transform = 'translateX(-50%) rotate(0deg)';
    }
  }, [clearAll, duration, maxLives, sounds]);

  // ── Pause / resume ─────────────────────────────────────────────────────────
  const pauseGame = useCallback(() => {
    if (phaseRef.current !== 'playing' || pausedRef.current) return;
    pausedRef.current  = true;
    pauseStartRef.current = Date.now();
    setPaused(true);
    sounds.stopBgMusic?.();
  }, [sounds]);

  const resumeGame = useCallback(() => {
    if (!pausedRef.current) return;
    // Shift every timing reference forward by the paused duration so the
    // collision loop stays in sync with the (frozen) CSS fall animations.
    const delta = Date.now() - pauseStartRef.current;
    itemsRef.current = itemsRef.current.map(it => ({ ...it, spawnedAt: it.spawnedAt + delta }));
    setItems([...itemsRef.current]);
    startTimeRef.current += delta;
    pausedRef.current = false;
    setPaused(false);
    sounds.startBgMusic();
  }, [sounds]);

  const quitGame = useCallback(() => {
    clearAll();
    pausedRef.current = false;
    setPaused(false);
    phaseRef.current = 'result';
    onComplete({
      score: scoreRef.current,
      maxPossibleScore: Math.max(scoreRef.current, 1),
      durationMs: Date.now() - startTimeRef.current,
      hintUsed: false,
    });
  }, [clearAll, onComplete]);

  // ── Difficulty (ramps every 30s) ───────────────────────────────────────────
  // level 0,1,2... → faster falls, faster spawns, more bad items
  const difficultyLevel = useCallback(
    () => Math.min(4, Math.floor((Date.now() - startTimeRef.current) / 30000)),
    [],
  );

  // ── Spawn ──────────────────────────────────────────────────────────────────
  const spawnItem = useCallback(() => {
    if (phaseRef.current !== 'playing' || pausedRef.current) return;
    const level   = difficultyLevel();
    const badNow  = Math.min(0.5, badChance + level * 0.05);
    const isGood  = Math.random() > badNow;
    const def     = pickWeighted(isGood ? GOOD_DEFS : BAD_DEFS);
    const slowing = Date.now() < slowUntilRef.current ? 1.8 : 1;
    const speed   = Math.pow(0.85, level); // higher level → shorter (faster) fall
    const item: FallingItem = {
      id:           nextId(),
      src:          def.src,
      isGood:       def.good,
      kind:         def.kind,
      points:       def.points,
      effect:       def.effect,
      x:            10 + Math.random() * 72,
      fallDuration: (fallMin + Math.random() * (fallMax - fallMin)) * speed * slowing,
      rotation:     -20 + Math.random() * 40,
      spawnedAt:    Date.now(),
    };
    itemsRef.current = [...itemsRef.current, item];
    setItems([...itemsRef.current]);
  }, [badChance, fallMin, fallMax, difficultyLevel]);

  // ── Playing effects ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;

    // Spawn loop — self-rescheduling so the rate can ramp with difficulty + slow-mo
    const spawnLoop = () => {
      spawnItem();
      const level = difficultyLevel();
      const slow  = Date.now() < slowUntilRef.current;
      const delay = Math.max(300, spawnMs * Math.pow(0.9, level) * (slow ? 1.6 : 1));
      spawnTimer.current = window.setTimeout(spawnLoop, delay);
    };
    spawnLoop();

    timerInterval.current = window.setInterval(() => {
      if (pausedRef.current) return;
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearAll();
          phaseRef.current = 'result';
          itemsRef.current = [];
          setItems([]);
          setPhase('result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Collision detection
    collInterval.current = window.setInterval(() => {
      if (phaseRef.current !== 'playing' || pausedRef.current) return;
      const now = Date.now();
      const bx  = bucketXRef.current;
      const cur = itemsRef.current;

      let goodCaught = 0;
      let badCaught  = 0;
      let scoreGain  = 0;
      let comboGain  = 0;
      let gotCelery  = false;
      const newCaughtAnims: CaughtAnim[] = [];
      const newPopups: { x: number; y: number; text: string; good: boolean }[] = [];

      const survived = cur.filter(item => {
        const progress = (now - item.spawnedAt) / item.fallDuration;

          if (progress >= CATCH_PROGRESS_START && progress < CATCH_PROGRESS_END) {
          if (Math.abs(item.x - bx) <= CATCH_X_RADIUS) {
            const catchY = progressToTopPct(progress);
            newCaughtAnims.push({ id: nextId(), src: item.src, x: item.x, y: catchY });
            newPopups.push({ x: item.x, y: catchY + 2, text: item.isGood ? `+${item.points}` : '✗', good: item.isGood });
            if (item.isGood) {
              goodCaught++;
              scoreGain += item.points;
              comboGain += item.effect === 'combo' ? 2 : 1; // lemon → bonus combo
              if (item.effect === 'slow') gotCelery = true;
            } else {
              badCaught++;
            }
            return false;
          }
        }

        if (progress >= CATCH_PROGRESS_END + 0.05) return false;
        return true;
      });

      if (survived.length !== cur.length) {
        itemsRef.current = survived;
        setItems([...survived]);
      }

      // Catch animations
      if (newCaughtAnims.length > 0) {
        setCaughtAnims(prev => [...prev, ...newCaughtAnims]);
        const ids = newCaughtAnims.map(a => a.id);
        setTimeout(() => setCaughtAnims(prev => prev.filter(a => !ids.includes(a.id))), 380);
      }

      // Score popups
      if (newPopups.length > 0) {
        const ids: string[] = [];
        setScorePopups(prev => {
          const added = newPopups.map(p => ({ ...p, id: nextId() }));
          ids.push(...added.map(a => a.id));
          return [...prev, ...added];
        });
        setTimeout(() => setScorePopups(prev => prev.filter(p => !ids.includes(p.id))), 860);
      }

      // Good catch effects
      if (goodCaught > 0) {
        const newCombo = comboRef.current + comboGain;
        const newScore = scoreRef.current + scoreGain;
        const newBest  = Math.max(bestComboRef.current, newCombo);
        comboRef.current     = newCombo;
        scoreRef.current     = newScore;
        bestComboRef.current = newBest;
        setScore(newScore);
        setCombo(newCombo);
        setBestCombo(newBest);
        setComboKey(k => k + 1);
        sounds.playCorrect();
        if (gotCelery) slowUntilRef.current = Date.now() + 5000; // celery → 5s slow-mo

        if (newCombo >= HOT_STREAK_AT && newCombo % HOT_STREAK_AT === 0) {
          setShowStreak(true);
          setStreakKey(k => k + 1);
          if (streakTimeout.current) clearTimeout(streakTimeout.current);
          streakTimeout.current = setTimeout(() => setShowStreak(false), 1900);
        }
      }

      // Bad catch effects
      if (badCaught > 0) {
        comboRef.current = 0;
        setCombo(0);
        setComboKey(k => k + 1);
        const newLives = Math.max(0, livesRef.current - badCaught);
        livesRef.current = newLives;
        setLives(newLives);
        // Animate the heart that was just lost
        setHeartKeys(prev => {
          const next = [...prev];
          const lostIdx = newLives; // 0-indexed: newLives is the new count, so index newLives was lost
          if (lostIdx < next.length) next[lostIdx] = next[lostIdx] + 1;
          return next;
        });
        sounds.playWrong();
        setVignetteKey(k => k + 1); // red vignette around edges

        if (newLives <= 0) {
          clearAll();
          phaseRef.current = 'fail';
          itemsRef.current = [];
          setItems([]);
          setPhase('fail');
        }
      }
    }, 80);

    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => clearAll, [clearAll]);

  useEffect(() => {
    if (phase === 'result') sounds.playGameOver();
  }, [phase, sounds]);

  // ── Bucket movement (direct DOM — zero lag) ────────────────────────────────
  const moveBucket = useCallback((clientX: number, rect: DOMRect) => {
    const x   = Math.max(12, Math.min(88, ((clientX - rect.left) / rect.width) * 100));
    const dx  = x - lastPtrXRef.current;
    lastPtrXRef.current = x;
    bucketXRef.current  = x;

    const tilt = Math.max(-16, Math.min(16, dx * 3));
    const el   = bucketRef.current;
    if (el) {
      el.style.transition = 'none';
      el.style.left       = `${x}%`;
      el.style.transform  = `translateX(-50%) rotate(${tilt}deg)`;
    }
    if (tiltResetRef.current) clearTimeout(tiltResetRef.current);
    tiltResetRef.current = setTimeout(() => {
      if (bucketRef.current) {
        bucketRef.current.style.transition = 'transform 280ms ease-out';
        bucketRef.current.style.transform  = 'translateX(-50%) rotate(0deg)';
      }
    }, 90);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== 'playing' || pausedRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    moveBucket(e.clientX, e.currentTarget.getBoundingClientRect());
  }, [moveBucket]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== 'playing' || pausedRef.current) return;
    moveBucket(e.clientX, e.currentTarget.getBoundingClientRect());
  }, [moveBucket]);

  // ── Finish ─────────────────────────────────────────────────────────────────
  const handleFinish = useCallback(() => {
    const est = Math.floor(duration * (1 / (spawnMs / 1000)) * (1 - badChance)) * points;
    onComplete({
      score: scoreRef.current,
      maxPossibleScore: Math.max(est, scoreRef.current),
      durationMs: Date.now() - startTimeRef.current,
      hintUsed: false,
    });
  }, [duration, spawnMs, badChance, points, onComplete]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const heartsList = Array.from({ length: maxLives }, (_, i) => (
    <HeartEl
      key={i}
      $lost={i >= lives}
      $animKey={heartKeys[i] ?? 0}
    >
      ❤️
    </HeartEl>
  ));

  return (
    <GameRoot
      ref={gameRootRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    >
      <GameBg src={BG_IMG} alt="" />

      {/* Red vignette on bad catch */}
      {vignetteKey > 0 && <VignetteFlash key={vignetteKey} />}

      {/* HUD — self-drawn vector recreation of the designed bar.
          viewBox matches the original 1023x204 artwork so slots line up. */}
      {phase === 'playing' && (
        <HudBar>
          <HudBarSvg viewBox="0 0 1023 250" preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="lcBody" cx="42%" cy="12%" r="95%">
                <stop offset="0%" stopColor="#5e3a1c" />
                <stop offset="38%" stopColor="#3a200f" />
                <stop offset="74%" stopColor="#22120a" />
                <stop offset="100%" stopColor="#0e0602" />
              </radialGradient>
              <radialGradient id="lcTopGlow" cx="42%" cy="0%" r="75%">
                <stop offset="0%" stopColor="#ff9a3c" stopOpacity="0.40" />
                <stop offset="55%" stopColor="#ff7a1e" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#ff7a1e" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="lcSlot" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#080402" />
                <stop offset="55%" stopColor="#1b0d05" />
                <stop offset="100%" stopColor="#301a0a" />
              </linearGradient>
              <radialGradient id="lcCombo" cx="50%" cy="30%" r="82%">
                <stop offset="0%" stopColor="#8e3219" />
                <stop offset="52%" stopColor="#591d0d" />
                <stop offset="100%" stopColor="#2c0f05" />
              </radialGradient>
              <linearGradient id="lcRim" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffdc86" />
                <stop offset="32%" stopColor="#e4a23c" />
                <stop offset="68%" stopColor="#a9651f" />
                <stop offset="100%" stopColor="#6e3d12" />
              </linearGradient>
              <filter id="lcGrain">
                <feTurbulence type="fractalNoise" baseFrequency="0.011 0.05" numOctaves="3" seed="5" result="n" />
                <feColorMatrix in="n" type="saturate" values="0" />
                <feComponentTransfer><feFuncA type="linear" slope="0.07" /></feComponentTransfer>
              </filter>
            </defs>

            {/* bar body — bottom is a wide arch: LOW at the sides, RISES in the center */}
            <path
              d="M0,0 H1023 V204 C 730,176 590,170 511,170 C 432,170 293,176 0,204 Z"
              fill="url(#lcBody)"
            />
            {/* wood grain */}
            <path
              d="M0,0 H1023 V204 C 730,176 590,170 511,170 C 432,170 293,176 0,204 Z"
              filter="url(#lcGrain)"
              opacity="0.5"
            />
            {/* warm top glow + top highlight line */}
            <rect x="0" y="0" width="1023" height="150" fill="url(#lcTopGlow)" />
            <rect x="0" y="0" width="1023" height="4" fill="rgba(255,190,95,0.28)" />
            {/* thick orange/gold border running ALONG the arch */}
            <path
              d="M0,204 C 293,176 432,170 511,170 C 590,170 730,176 1023,204"
              fill="none"
              stroke="#5a2c0c"
              strokeWidth="18"
              strokeLinecap="round"
            />
            <path
              d="M0,204 C 293,176 432,170 511,170 C 590,170 730,176 1023,204"
              fill="none"
              stroke="url(#lcRim)"
              strokeWidth="10"
              strokeLinecap="round"
            />

            {/* score slot (left of combo) */}
            <g>
              <rect x="223" y="26" width="196" height="108" rx="30" fill="#0a0502" />
              <rect x="227" y="30" width="188" height="100" rx="27" fill="url(#lcSlot)" stroke="rgba(120,62,22,0.85)" strokeWidth="2.5" />
              <rect x="237" y="118" width="168" height="8" rx="4" fill="rgba(255,150,60,0.12)" />
            </g>
            {/* time slot (right of combo) */}
            <g>
              <rect x="603" y="26" width="196" height="108" rx="30" fill="#0a0502" />
              <rect x="607" y="30" width="188" height="100" rx="27" fill="url(#lcSlot)" stroke="rgba(120,62,22,0.85)" strokeWidth="2.5" />
              <rect x="617" y="118" width="168" height="8" rx="4" fill="rgba(255,150,60,0.12)" />
            </g>

            {/* center combo squircle badge — dead center, wide enough for 2 digits */}
            <g>
              <rect x="434" y="12" width="154" height="150" rx="48" fill="#150a04" />
              <rect x="439" y="17" width="144" height="140" rx="44" fill="url(#lcRim)" />
              <rect x="453" y="31" width="116" height="112" rx="37" fill="url(#lcCombo)" stroke="#2a0f06" strokeWidth="2.5" />
              <path d="M461,46 Q479,30 507,29" fill="none" stroke="rgba(255,235,180,0.45)" strokeWidth="3.5" strokeLinecap="round" />
            </g>

            {/* pause button — right side */}
            <g>
              <circle cx="952" cy="82" r="48" fill="#150a04" />
              <circle cx="952" cy="82" r="45" fill="url(#lcRim)" />
              <circle cx="952" cy="82" r="37" fill="#1c0e06" />
              <rect x="937" y="64" width="11" height="36" rx="5" fill="#ffcf5a" />
              <rect x="956" y="64" width="11" height="36" rx="5" fill="#ffcf5a" />
            </g>
          </HudBarSvg>
          <LogoImg src={LOGO_IMG} alt="Lucky Chicken" />
          <HudOverlay>
            <HudSection $left={31}>
              <HudLabel>{t.score}</HudLabel>
              <HudValue>{score}</HudValue>
            </HudSection>
            <HudComboSection>
              <HudLabel>{t.combo}</HudLabel>
              <HudComboValue key={comboKey} $key={comboKey}>×{combo}</HudComboValue>
            </HudComboSection>
            <HudSection $left={69}>
              <HudLabel>{t.timeLeft}</HudLabel>
              <HudValue>{formatTime(timeLeft)}</HudValue>
            </HudSection>
            <LivesRow>{heartsList}</LivesRow>
          </HudOverlay>
          <PauseHit
            type="button"
            aria-label="Pause"
            onPointerDown={e => { e.stopPropagation(); pauseGame(); }}
          />
        </HudBar>
      )}

      <GameField ref={gameFieldRef}>
        {/* Falling items */}
        {phase === 'playing' && items.map(item => (
          <FallingItemWrapper
            key={item.id}
            $x={item.x}
            $duration={item.fallDuration}
            $rotation={item.rotation}
            $paused={paused}
          >
            <FallingItemImg src={item.src} alt="" />
          </FallingItemWrapper>
        ))}

        {/* Caught item fly-to-bucket animations */}
        {caughtAnims.map(anim => (
          <CaughtItemWrapper key={anim.id} $x={anim.x} $y={anim.y}>
            <FallingItemImg src={anim.src} alt="" />
          </CaughtItemWrapper>
        ))}

        {/* Score popups */}
        {scorePopups.map(p => (
          <ScorePopupEl key={p.id} $x={p.x} $y={p.y} $good={p.good}>
            {p.text}
          </ScorePopupEl>
        ))}

        {/* HOT STREAK — key forces re-animation every trigger */}
        {showStreak && (
          <HotStreakOverlay key={streakKey}>
            <SunburstRays />
            <ShootingBeams />
            <SunburstGlow />
            <HotStreakImg src={HOT_STREAK_IMG} alt="" />
            <Sparkle $top={20} $left={12} $delay={150} $size={22}>✦</Sparkle>
            <Sparkle $top={26} $left={80} $delay={280} $size={18}>✦</Sparkle>
            <Sparkle $top={58} $left={8}  $delay={200} $size={20}>✦</Sparkle>
            <Sparkle $top={62} $left={86} $delay={320} $size={16}>✦</Sparkle>
            <Sparkle $top={14} $left={48} $delay={100} $size={14}>✦</Sparkle>
            <Sparkle $top={68} $left={55} $delay={240} $size={18}>✦</Sparkle>
          </HotStreakOverlay>
        )}

        {/* Bucket */}
        {phase === 'playing' && (
          <BucketEl ref={bucketRef} src={BUCKET_IMG} alt="" />
        )}
      </GameField>

      {/* PAUSE MENU */}
      {phase === 'playing' && paused && (
        <PauseOverlay onPointerDown={e => e.stopPropagation()}>
          <PauseTitle>{t.paused}</PauseTitle>
          <GoldButton
            type="button"
            style={{ animationDelay: '40ms', animationDuration: '220ms' }}
            onPointerDown={e => { e.stopPropagation(); resumeGame(); }}
          >
            <GoldButtonBg src={GOLD_BUTTON_IMG} alt="" />
            <GoldButtonText>{t.resume}</GoldButtonText>
          </GoldButton>
          <QuitButton type="button" onPointerDown={e => { e.stopPropagation(); quitGame(); }}>
            {t.quit}
          </QuitButton>
        </PauseOverlay>
      )}

      {/* START */}
      {phase === 'start' && (
        <StartOverlay onPointerDown={() => setPhase('instructions')}>
          <StartLogo src={LOGO_IMG} alt="Lucky Chicken" />
          <MascotImg src={MASCOT_IMG} alt="" style={{ animationDelay: '0ms' }} />
          <StartTitle>{t.gameTitle}</StartTitle>
          <StartDesc>{t.startDesc}</StartDesc>
          <GoldButton type="button" onPointerDown={e => { e.stopPropagation(); setPhase('instructions'); }}>
            <GoldButtonBg src={GOLD_BUTTON_IMG} alt="" />
            <GoldButtonText>{t.start}</GoldButtonText>
          </GoldButton>
        </StartOverlay>
      )}

      {/* INSTRUCTIONS */}
      {phase === 'instructions' && (
        <InstructionsOverlay>
          <InstrBlock $delay={60}>
            <InstrHeading $good>✅ {t.catchThese}</InstrHeading>
            <InstrItems>
              {CATCH_ITEMS.map(d => (
                <InstrItemImg key={d.kind + d.src} src={d.src} alt={d.kind} />
              ))}
            </InstrItems>
          </InstrBlock>
          <InstrBlock $delay={180}>
            <InstrHeading>❌ {t.avoidThese}</InstrHeading>
            <InstrItems>
              {AVOID_ITEMS.map(d => (
                <InstrItemImg key={d.kind + d.src} src={d.src} alt={d.kind} />
              ))}
            </InstrItems>
          </InstrBlock>
          <InstrHint>{t.instructionsHint}</InstrHint>
          <GoldButton
            type="button"
            style={{ animationDelay: '60ms', animationDuration: '240ms' }}
            onPointerDown={e => { e.stopPropagation(); startGame(); }}
          >
            <GoldButtonBg src={GOLD_BUTTON_IMG} alt="" />
            <GoldButtonText>{t.letsPlay}</GoldButtonText>
          </GoldButton>
        </InstructionsOverlay>
      )}

      {/* FAIL */}
      {phase === 'fail' && (
        <FailOverlay>
          <OverlayTitle src={OOPS_IMG} alt="" />
          <BurntFailImg src={BURNT_FAIL_IMG} alt="" />
          <ScorePanel>
            <ScorePanelLabel>{t.yourScore}</ScorePanelLabel>
            <ScorePanelValue>{score}</ScorePanelValue>
          </ScorePanel>
          <GoldButton type="button" onPointerDown={startGame}>
            <GoldButtonBg src={GOLD_BUTTON_IMG} alt="" />
            <GoldButtonText>{t.tryAgain}</GoldButtonText>
          </GoldButton>
        </FailOverlay>
      )}

      {/* RESULT */}
      {phase === 'result' && (
        <ResultOverlay>
          <OverlayTitle src={WELL_DONE_IMG} alt="" />
          <MascotImg src={MASCOT_IMG} alt="" />
          <ScorePanel>
            <ScorePanelLabel>{t.yourScore}</ScorePanelLabel>
            <ScorePanelValue>{score}</ScorePanelValue>
            <ScorePanelSub>{t.bestCombo}: ×{bestCombo}</ScorePanelSub>
          </ScorePanel>
          <RankBadge>
            <RankLabel>{t.rankTitle}</RankLabel>
            <RankValue>{t[rankKey(score)]}</RankValue>
          </RankBadge>
          <GoldButton type="button" onPointerDown={startGame}>
            <GoldButtonBg src={GOLD_BUTTON_IMG} alt="" />
            <GoldButtonText>{t.playAgain}</GoldButtonText>
          </GoldButton>
          <GoldButton
            type="button"
            style={{ animationDelay: '850ms' }}
            onPointerDown={handleFinish}
          >
            <GoldButtonBg src={GOLD_BUTTON_IMG} alt="" />
            <GoldButtonText>{t.nextGame}</GoldButtonText>
          </GoldButton>
        </ResultOverlay>
      )}
    </GameRoot>
  );
}
