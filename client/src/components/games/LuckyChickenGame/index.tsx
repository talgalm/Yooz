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
  HudBgImg,
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
  SunburstGlow,
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
} from './styled';

// ── Assets ────────────────────────────────────────────────────────────────────

const LC = (f: string) => `/images/lucky-chicken/${f}`;

const BG_IMG          = LC('3f194707-08f4-4524-8bb6-f6ae6b68f7cd.svg');
const HUD_IMG         = LC('Untitled-1.svg');
const MASCOT_IMG      = LC('b95d2929-be1f-4bf3-82de-9adcc5fe482b.svg');
const BUCKET_IMG      = LC('817a72bf-5e18-4a8e-9e41-05cc60664d73.svg');
const HOT_STREAK_IMG  = LC('bbd77ff3-5ecc-4a4b-9007-7cb1ae35a29e.svg');
const OOPS_IMG        = LC('3e0c9351-3d3d-48a7-a45d-50c6bf4d2537.svg');
const WELL_DONE_IMG   = LC('cd259949-f86e-4929-a31e-0294b3d2c345.svg');
const BURNT_FAIL_IMG  = LC('bdedfe51-0c86-4634-923a-a1b6195a2f90.svg');
const GOLD_BUTTON_IMG = LC('bde31a22-79d3-4db8-a6b4-0bef18d7d164.svg');

const GOOD_ITEMS = [
  LC('70c36d88-b6d7-48ef-aeaa-ce060cec82b8.svg'),
  LC('83487a97-92a9-4f85-8ad8-1a3a4210e5c8.svg'),
  LC('8a7fcd66-0f22-4743-ae02-fe78ec740ca9.svg'),
];
const BAD_ITEM = LC('64b12ccc-c8e0-49aa-97fe-d0a1ed8fdca3.svg');

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'start' | 'playing' | 'fail' | 'result';

interface FallingItem {
  id: string;
  src: string;
  isGood: boolean;
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
  // Per-heart animation keys (increment when that heart is lost)
  const [heartKeys,   setHeartKeys]   = useState<number[]>(() => Array(DEFAULT_MAX_LIVES).fill(0));

  // ── Refs ───────────────────────────────────────────────────────────────────
  const phaseRef       = useRef<Phase>('start');
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
    phase === 'result' ? 'finish' : phase === 'start' ? 'intro' : 'playing';
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

  // ── Spawn ──────────────────────────────────────────────────────────────────
  const spawnItem = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const isGood = Math.random() > badChance;
    const item: FallingItem = {
      id:           nextId(),
      src:          isGood ? GOOD_ITEMS[Math.floor(Math.random() * GOOD_ITEMS.length)] : BAD_ITEM,
      isGood,
      x:            10 + Math.random() * 72,
      fallDuration: fallMin + Math.random() * (fallMax - fallMin),
      rotation:     -20 + Math.random() * 40,
      spawnedAt:    Date.now(),
    };
    itemsRef.current = [...itemsRef.current, item];
    setItems([...itemsRef.current]);
  }, [badChance, fallMin, fallMax]);

  // ── Playing effects ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;

    spawnItem();
    spawnTimer.current = window.setInterval(spawnItem, spawnMs);

    timerInterval.current = window.setInterval(() => {
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
      if (phaseRef.current !== 'playing') return;
      const now = Date.now();
      const bx  = bucketXRef.current;
      const cur = itemsRef.current;

      let goodCaught = 0;
      let badCaught  = 0;
      const newCaughtAnims: CaughtAnim[] = [];
      const newPopups: { x: number; y: number; text: string; good: boolean }[] = [];

      const survived = cur.filter(item => {
        const progress = (now - item.spawnedAt) / item.fallDuration;

          if (progress >= CATCH_PROGRESS_START && progress < CATCH_PROGRESS_END) {
          if (Math.abs(item.x - bx) <= CATCH_X_RADIUS) {
            const catchY = progressToTopPct(progress);
            newCaughtAnims.push({ id: nextId(), src: item.src, x: item.x, y: catchY });
            newPopups.push({ x: item.x, y: catchY + 2, text: item.isGood ? `+${points}` : '✗', good: item.isGood });
            if (item.isGood) goodCaught++; else badCaught++;
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
        const newCombo = comboRef.current + goodCaught;
        const newScore = scoreRef.current + goodCaught * points;
        const newBest  = Math.max(bestComboRef.current, newCombo);
        comboRef.current     = newCombo;
        scoreRef.current     = newScore;
        bestComboRef.current = newBest;
        setScore(newScore);
        setCombo(newCombo);
        setBestCombo(newBest);
        setComboKey(k => k + 1);
        sounds.playCorrect();

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
    if (phaseRef.current !== 'playing') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    moveBucket(e.clientX, e.currentTarget.getBoundingClientRect());
  }, [moveBucket]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== 'playing') return;
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

      {/* HUD */}
      {phase === 'playing' && (
        <HudBar>
          <HudBgImg src={HUD_IMG} alt="" />
          <HudSection>
            <HudLabel>{t.timeLeft}</HudLabel>
            <HudValue>{formatTime(timeLeft)}</HudValue>
          </HudSection>
          <HudComboSection>
            <HudLabel>{t.combo}</HudLabel>
            <HudComboValue key={comboKey} $key={comboKey}>×{combo}</HudComboValue>
          </HudComboSection>
          <HudSection>
            <HudLabel>{t.score}</HudLabel>
            <HudValue>{score}</HudValue>
          </HudSection>
          <LivesRow>{heartsList}</LivesRow>
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
            <SunburstGlow />
            <HotStreakImg src={HOT_STREAK_IMG} alt="" />
          </HotStreakOverlay>
        )}

        {/* Bucket */}
        {phase === 'playing' && (
          <BucketEl ref={bucketRef} src={BUCKET_IMG} alt="" />
        )}
      </GameField>

      {/* START */}
      {phase === 'start' && (
        <StartOverlay onPointerDown={startGame}>
          <MascotImg src={MASCOT_IMG} alt="Lucky Chicken" style={{ animationDelay: '0ms' }} />
          <GoldButton type="button" onPointerDown={e => { e.stopPropagation(); startGame(); }}>
            <GoldButtonBg src={GOLD_BUTTON_IMG} alt="" />
            <GoldButtonText>{t.tapToStart}</GoldButtonText>
          </GoldButton>
        </StartOverlay>
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
          <GoldButton type="button" onPointerDown={handleFinish}>
            <GoldButtonBg src={GOLD_BUTTON_IMG} alt="" />
            <GoldButtonText>{t.nextGame}</GoldButtonText>
          </GoldButton>
        </ResultOverlay>
      )}
    </GameRoot>
  );
}
