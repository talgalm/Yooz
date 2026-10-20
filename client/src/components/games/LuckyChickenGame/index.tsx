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
  HudBarImg,
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
  BurntFailTitle,
  BurntFailWrap,
  SmokePuff,
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

const LC = (f: string) => `/images/lucky-chicken/${f}`;

const BG_IMG          = LC('bg.webp');
const LOGO_IMG        = LC('luckychicken-logo-gold.png');
const HUD_BAR_IMG     = LC('hud-bar.svg');
const MASCOT_IMG      = LC('mascot.webp');
const BUCKET_IMG      = LC('bucket.webp');
const HOT_STREAK_IMG  = LC('hot-streak.webp');
const OOPS_IMG        = LC('oops.webp');
const WELL_DONE_IMG   = LC('well-done.webp');
const BURNT_FAIL_IMG  = LC('burnt-fail.webp');
const GOLD_BUTTON_IMG = LC('gold-button.webp');

type ItemEffect = 'combo' | 'slow';
interface ItemDef {
  kind: string;
  src: string;
  good: boolean;
  points: number;
  effect?: ItemEffect;
  weight: number;
}

const ITEM_DEFS: ItemDef[] = [
  { kind: 'crispy', src: LC('item-crispy-1.webp'), good: true,  points: 100, weight: 5 },
  { kind: 'crispy', src: LC('item-crispy-2.webp'), good: true,  points: 100, weight: 5 },
  { kind: 'spicy',  src: LC('item-spicy.webp'), good: true,  points: 150, weight: 4 },
  { kind: 'corn',   src: LC('item-corn.svg'), good: true,  points: 80,  weight: 3 },
  { kind: 'lemon',  src: LC('item-lemon.svg'),  good: true,  points: 50, effect: 'combo', weight: 2 },
  { kind: 'celery', src: LC('item-celery.svg'), good: true,  points: 50, effect: 'slow',  weight: 1.6 },
  { kind: 'burnt',  src: LC('item-burnt.webp'), good: false, points: 150, weight: 5 },
  { kind: 'bone',   src: LC('item-bone.svg'),  good: false, points: 100, weight: 3 },
  { kind: 'chili',  src: LC('item-chili.svg'), good: false, points: 0,   weight: 2 },
];
const GOOD_DEFS = ITEM_DEFS.filter(d => d.good);
const AVERAGE_GOOD_POINTS = GOOD_DEFS.reduce((s, d) => s + d.points * d.weight, 0) / GOOD_DEFS.reduce((s, d) => s + d.weight, 0);
const BAD_DEFS  = ITEM_DEFS.filter(d => !d.good);

function pickWeighted(defs: ItemDef[]): ItemDef {
  const total = defs.reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * total;
  for (const d of defs) { r -= d.weight; if (r <= 0) return d; }
  return defs[defs.length - 1];
}

const CATCH_ITEMS = [
  ITEM_DEFS.find(d => d.kind === 'crispy')!,
  ITEM_DEFS.find(d => d.kind === 'spicy')!,
  ITEM_DEFS.find(d => d.kind === 'corn')!,
  ITEM_DEFS.find(d => d.kind === 'lemon')!,
  ITEM_DEFS.find(d => d.kind === 'celery')!,
];
const AVOID_ITEMS = BAD_DEFS;

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
  y: number;
}

interface ScorePopup {
  id: string;
  x: number;
  y: number;
  text: string;
  good: boolean;
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

const DEFAULT_DURATION   = 75;
const DEFAULT_POINTS     = 10;
const DEFAULT_BAD_CHANCE = 0.22;
const DEFAULT_SPAWN_MS   = 900;
const DEFAULT_FALL_MIN   = 2800;
const DEFAULT_FALL_MAX   = 5200;
const DEFAULT_MAX_LIVES  = 3;
const HOT_STREAK_AT      = 5;

const CATCH_PROGRESS_START = 0.67;
const CATCH_PROGRESS_END   = 0.78;
const CATCH_X_RADIUS       = 22;

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function progressToTopPct(p: number) { return -15 + p * 127; }

let uid = 0;
const nextId = () => `lc_${++uid}`;

export default function LuckyChickenGame({ game, onComplete }: GameProps) {
  const settings  = game.settings as unknown as LuckyChickenSettings;
  const duration  = settings.durationSeconds  ?? DEFAULT_DURATION;
  const points    = settings.pointsPerCatch   ?? DEFAULT_POINTS;
  const badChance = settings.badItemChance    ?? DEFAULT_BAD_CHANCE;
  const spawnMs   = settings.spawnIntervalMs  ?? DEFAULT_SPAWN_MS;
  const fallMin   = settings.fallDurationMin  ?? DEFAULT_FALL_MIN;
  const fallMax   = settings.fallDurationMax  ?? DEFAULT_FALL_MAX;
  const maxLives  = settings.maxLives         ?? DEFAULT_MAX_LIVES;

  const pointScale = points / DEFAULT_POINTS;
  const expectedMaxScore = Math.round(duration * (1000 / spawnMs) * (1 - badChance) * AVERAGE_GOOD_POINTS * pointScale);

  const t      = useTranslations(texts);
  const sounds = useGameSounds();

  const [phase,       setPhase]       = useState<Phase>('start');
  const [score,       setScore]       = useState(0);
  const [combo,       setCombo]       = useState(0);
  const [bestCombo,   setBestCombo]   = useState(0);
  const [lives,       setLives]       = useState(maxLives);
  const [timeLeft,    setTimeLeft]    = useState(duration);
  const [items,       setItems]       = useState<FallingItem[]>([]);
  const [caughtAnims, setCaughtAnims] = useState<CaughtAnim[]>([]);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const [vignetteKey, setVignetteKey] = useState(0);
  const [streakKey,   setStreakKey]   = useState(0);
  const [comboKey,    setComboKey]    = useState(0);
  const [showStreak,  setShowStreak]  = useState(false);
  const [paused,      setPaused]      = useState(false);
  const [heartKeys,   setHeartKeys]   = useState<number[]>(() => Array(DEFAULT_MAX_LIVES).fill(0));

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

  const activityHeaderAudio = useActivityPlayingHeaderHostActive();
  const headerPhase: ActivityGameHeaderPhase =
    phase === 'result' ? 'finish'
      : (phase === 'start' || phase === 'instructions') ? 'intro'
      : 'playing';
  useRegisterActivityGameHeader(activityHeaderAudio, headerPhase, sounds.isMuted, sounds.toggleMute);

  const clearAll = useCallback(() => {
    if (spawnTimer.current)    { clearInterval(spawnTimer.current);    spawnTimer.current    = null; }
    if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
    if (collInterval.current)  { clearInterval(collInterval.current);  collInterval.current  = null; }
    if (streakTimeout.current) { clearTimeout(streakTimeout.current);  streakTimeout.current = null; }
    if (tiltResetRef.current)  { clearTimeout(tiltResetRef.current);   tiltResetRef.current  = null; }
  }, []);

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
    setShowStreak(false);
    startTimeRef.current = Date.now();
    sounds.startBgMusic();

    if (bucketRef.current) {
      bucketRef.current.style.transition = 'none';
      bucketRef.current.style.left = '50%';
      bucketRef.current.style.transform = 'translateX(-50%) rotate(0deg)';
    }
  }, [clearAll, duration, maxLives, sounds]);

  const pauseGame = useCallback(() => {
    if (phaseRef.current !== 'playing' || pausedRef.current) return;
    pausedRef.current  = true;
    pauseStartRef.current = Date.now();
    setPaused(true);
    sounds.stopBgMusic?.();
  }, [sounds]);

  const resumeGame = useCallback(() => {
    if (!pausedRef.current) return;
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
      maxPossibleScore: Math.max(expectedMaxScore, scoreRef.current, 1),
      durationMs: Date.now() - startTimeRef.current,
      hintUsed: false,
    });
  }, [clearAll, onComplete, expectedMaxScore]);

  const difficultyLevel = useCallback(
    () => Math.min(4, Math.floor((Date.now() - startTimeRef.current) / 30000)),
    [],
  );

  const spawnItem = useCallback(() => {
    if (phaseRef.current !== 'playing' || pausedRef.current) return;
    const level   = difficultyLevel();
    const badNow  = Math.min(0.5, badChance + level * 0.05);
    const isGood  = Math.random() > badNow;
    const def     = pickWeighted(isGood ? GOOD_DEFS : BAD_DEFS);
    const slowing = Date.now() < slowUntilRef.current ? 1.8 : 1;
    const speed   = Math.pow(0.85, level);
    const item: FallingItem = {
      id:           nextId(),
      src:          def.src,
      isGood:       def.good,
      kind:         def.kind,
      points:       Math.round(def.points * pointScale),
      effect:       def.effect,
      x:            10 + Math.random() * 72,
      fallDuration: (fallMin + Math.random() * (fallMax - fallMin)) * speed * slowing,
      rotation:     -20 + Math.random() * 40,
      spawnedAt:    Date.now(),
    };
    itemsRef.current = [...itemsRef.current, item];
    setItems([...itemsRef.current]);
  }, [badChance, fallMin, fallMax, difficultyLevel, pointScale]);

  useEffect(() => {
    if (phase !== 'playing') return;

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
              comboGain += item.effect === 'combo' ? 2 : 1;
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

      if (newCaughtAnims.length > 0) {
        setCaughtAnims(prev => [...prev, ...newCaughtAnims]);
        const ids = newCaughtAnims.map(a => a.id);
        setTimeout(() => setCaughtAnims(prev => prev.filter(a => !ids.includes(a.id))), 380);
      }

      if (newPopups.length > 0) {
        const ids: string[] = [];
        setScorePopups(prev => {
          const added = newPopups.map(p => ({ ...p, id: nextId() }));
          ids.push(...added.map(a => a.id));
          return [...prev, ...added];
        });
        setTimeout(() => setScorePopups(prev => prev.filter(p => !ids.includes(p.id))), 860);
      }

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
        if (gotCelery) slowUntilRef.current = Date.now() + 5000;

        if (newCombo >= HOT_STREAK_AT && newCombo % HOT_STREAK_AT === 0) {
          setShowStreak(true);
          setStreakKey(k => k + 1);
          if (streakTimeout.current) clearTimeout(streakTimeout.current);
          streakTimeout.current = setTimeout(() => setShowStreak(false), 1900);
        }
      }

      if (badCaught > 0) {
        comboRef.current = 0;
        setCombo(0);
        setComboKey(k => k + 1);
        const newLives = Math.max(0, livesRef.current - badCaught);
        livesRef.current = newLives;
        setLives(newLives);
        setHeartKeys(prev => {
          const next = [...prev];
          const lostIdx = newLives;
          if (lostIdx < next.length) next[lostIdx] = next[lostIdx] + 1;
          return next;
        });
        sounds.playWrong();
        setVignetteKey(k => k + 1);

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

  const handleFinish = useCallback(() => {
    onComplete({
      score: scoreRef.current,
      maxPossibleScore: Math.max(expectedMaxScore, scoreRef.current),
      durationMs: Date.now() - startTimeRef.current,
      hintUsed: false,
    });
  }, [expectedMaxScore, onComplete]);

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

      {vignetteKey > 0 && <VignetteFlash key={vignetteKey} />}

      {phase === 'playing' && (
        <HudBar>
          <HudBarImg src={HUD_BAR_IMG} alt="" />
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
            aria-label={t.pause}
            onPointerDown={e => { e.stopPropagation(); pauseGame(); }}
          />
        </HudBar>
      )}

      <GameField ref={gameFieldRef}>
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

        {caughtAnims.map(anim => (
          <CaughtItemWrapper key={anim.id} $x={anim.x} $y={anim.y}>
            <FallingItemImg src={anim.src} alt="" />
          </CaughtItemWrapper>
        ))}

        {scorePopups.map(p => (
          <ScorePopupEl key={p.id} $x={p.x} $y={p.y} $good={p.good}>
            {p.text}
          </ScorePopupEl>
        ))}

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

        {phase === 'playing' && (
          <BucketEl ref={bucketRef} src={BUCKET_IMG} alt="" />
        )}
      </GameField>

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

      {phase === 'fail' && (
        <FailOverlay>
          <BurntFailTitle src={OOPS_IMG} alt="" />
          <BurntFailWrap>
            <SmokePuff $i={0} />
            <SmokePuff $i={1} />
            <SmokePuff $i={2} />
            <BurntFailImg src={BURNT_FAIL_IMG} alt="" />
          </BurntFailWrap>
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
