import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { styled, keyframes } from '@mui/material/styles';
import type { StationItemData } from '../../pages/StoryModulePage/types';
import type { GameResult } from '../games/types';
import { StationContinueButton, DESKTOP_BREAKPOINT, DesktopStationHeaderBand } from '../games/styled';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './ArStation.i18n';
import { themedTitleInk } from '../../utils/themeInk';
import { participantSessionId } from '../../utils/participantActivity';
import { arScore, arSettingsFrom } from '../../utils/arStation';
import { createCoinChime, immersiveArSupported, requestMotionAccess, startImmersiveAr, type CoinChime } from '../../utils/arSensors';
import ConfettiOverlay from './ConfettiOverlay';

const loadPlayfield = () => import('./ArPlayfield');
const ArPlayfield = lazy(loadPlayfield);

const Wrap = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '26px 16px 140px',
  boxSizing: 'border-box',
  overflowY: 'auto',
  [DESKTOP_BREAKPOINT]: {
    width: '100%',
    padding: '32px 24px 180px',
  },
});

const Title = styled('h2')({
  margin: '0 0 16px',
  fontSize: 26,
  fontWeight: 800,
  color: '#fff',
  WebkitTextStroke: '1.5px #000',
  paintOrder: 'stroke fill',
  textAlign: 'center',
  paddingTop: 8,
  [DESKTOP_BREAKPOINT]: {
    margin: 0,
    paddingTop: 0,
    fontSize: 42,
    fontWeight: 700,
    color: '#111',
    WebkitTextStroke: '0',
  },
});

const coinFloat = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-9px); }
`;

const shadowBreath = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.82); opacity: 0.7; }
`;

const sparkleTwinkle = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.6); opacity: 0.55; }
`;

const calmMotion = { '@media (prefers-reduced-motion: reduce)': { animation: 'none' } };

const Scene = styled('div')({
  position: 'relative',
  width: '100%',
  maxWidth: 340,
  height: 250,
  flexShrink: 0,
});

const FloatingCoin = styled('img')({
  position: 'absolute',
  display: 'block',
  ...calmMotion,
});

const HeroCoin = styled(FloatingCoin)({
  left: '50%',
  top: 30,
  width: 148,
  height: 148,
  marginLeft: -74,
  animation: `${coinFloat} 3s ease-in-out infinite`,
});

const SideCoin = styled(FloatingCoin)({
  left: '5%',
  top: 92,
  width: 68,
  height: 68,
  rotate: '-14deg',
  animation: `${coinFloat} 3.4s ease-in-out -1.2s infinite`,
});

const SmallCoin = styled(FloatingCoin)({
  right: '7%',
  top: 78,
  width: 58,
  height: 58,
  rotate: '12deg',
  animation: `${coinFloat} 2.8s ease-in-out -0.6s infinite`,
});

const GroundShadow = styled('div')({
  position: 'absolute',
  borderRadius: '50%',
  background: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0) 70%)',
  ...calmMotion,
});

const BigShadow = styled(GroundShadow)({
  left: '50%',
  top: 214,
  width: 104,
  height: 18,
  marginLeft: -52,
  animation: `${shadowBreath} 3s ease-in-out infinite`,
});

const SideShadow = styled(GroundShadow)({
  left: '6%',
  top: 196,
  width: 58,
  height: 11,
  animation: `${shadowBreath} 3.4s ease-in-out -1.2s infinite`,
});

const SmallShadow = styled(GroundShadow)({
  right: '7%',
  top: 188,
  width: 52,
  height: 10,
  animation: `${shadowBreath} 2.8s ease-in-out -0.6s infinite`,
});

const Sparkle = styled('div')({
  position: 'absolute',
  background: '#ffffff',
  clipPath: 'polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%)',
  animation: `${sparkleTwinkle} 2.2s ease-in-out infinite`,
  ...calmMotion,
});

const Bubble = styled('div')({
  position: 'relative',
  width: '100%',
  maxWidth: 330,
  marginTop: 14,
  padding: '16px 18px 14px',
  boxSizing: 'border-box',
  background: '#ffffff',
  borderRadius: 22,
  boxShadow: '0 10px 28px rgba(20, 50, 10, 0.22)',
  textAlign: 'center',
  flexShrink: 0,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -9,
    left: '50%',
    width: 20,
    height: 20,
    marginLeft: -10,
    background: '#ffffff',
    borderRadius: 4,
    transform: 'rotate(45deg)',
  },
  [DESKTOP_BREAKPOINT]: {
    maxWidth: 440,
    padding: '20px 26px 18px',
  },
});

const BubbleText = styled('p')({
  position: 'relative',
  margin: 0,
  fontSize: 17,
  fontWeight: 800,
  lineHeight: 1.45,
  color: '#23301b',
  whiteSpace: 'pre-line',
  [DESKTOP_BREAKPOINT]: {
    fontSize: 21,
  },
});

const MetaRow = styled('div')({
  marginTop: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  fontSize: 14,
  fontWeight: 700,
  color: '#5b6b4e',
});

const MetaItem = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
});

const MetaDivider = styled('span')({
  width: 4,
  height: 4,
  margin: '0 6px',
  borderRadius: '50%',
  background: '#b9c4ae',
});

const CoinDot = styled('span')({
  width: 13,
  height: 13,
  borderRadius: '50%',
  background: 'radial-gradient(circle at 35% 30%, #ffe68a 0%, #ffbe1a 60%, #d98a00 100%)',
});

const ClockFace = styled('span')({
  position: 'relative',
  width: 14,
  height: 14,
  borderRadius: '50%',
  border: '2px solid currentColor',
  boxSizing: 'border-box',
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 4,
    top: 1,
    width: 2,
    height: 5,
    borderRadius: 1,
    background: 'currentColor',
  },
});

const Row = styled('div')({
  position: 'fixed',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 40,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  maxWidth: 280,
  [DESKTOP_BREAKPOINT]: {
    maxWidth: 427,
    bottom: 32,
  },
});

const PrimaryActionButton = styled(StationContinueButton)({
  width: '100%',
  maxWidth: 280,
});

const ConfettiLayer = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 1450,
  pointerEvents: 'none',
});

const ResultOverlay = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 1400,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '36px 16px 130px',
  boxSizing: 'border-box',
  overflowY: 'auto',
  background: 'rgba(24, 16, 36, 0.5)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
});

const CelebrationScene = styled('div')({
  position: 'relative',
  width: '100%',
  maxWidth: 340,
  height: 220,
  flexShrink: 0,
});

const CelebrationGlow = styled('div')({
  position: 'absolute',
  left: '50%',
  top: 100,
  width: 420,
  height: 420,
  margin: '-210px 0 0 -210px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(255, 214, 90, 0.55) 0%, rgba(255, 214, 90, 0.12) 35%, rgba(255, 214, 90, 0) 60%)',
  pointerEvents: 'none',
});

const ResultHeadline = styled('h2')({
  margin: '4px 0 18px',
  fontSize: 40,
  fontWeight: 900,
  color: '#fff',
  WebkitTextStroke: '2px #1d0838',
  paintOrder: 'stroke fill',
  textShadow: '0 4px 0 #1d0838',
  textAlign: 'center',
});

const ResultBox = styled('div')({
  width: '100%',
  maxWidth: 330,
  padding: '18px 18px 16px',
  boxSizing: 'border-box',
  background: '#ffffff',
  borderRadius: 22,
  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.3)',
  textAlign: 'center',
  flexShrink: 0,
  [DESKTOP_BREAKPOINT]: {
    maxWidth: 440,
  },
});

const ResultLine = styled('p')({
  margin: 0,
  fontSize: 17,
  fontWeight: 800,
  color: '#23301b',
});

const SignedNumber = styled('span')({
  direction: 'ltr',
  unicodeBidi: 'isolate',
});

const ResultPoints = styled('div')({
  marginTop: 8,
  fontSize: 34,
  fontWeight: 900,
  lineHeight: 1.15,
  color: '#e09a00',
});

const ResultBonus = styled('div')({
  fontSize: 13.5,
  fontWeight: 700,
  color: '#8a7a55',
});

const ResultFinishText = styled('p')({
  margin: '12px 0 0',
  paddingTop: 12,
  borderTop: '1px dashed #e7dcc0',
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.4,
  color: '#4a4030',
  whiteSpace: 'pre-line',
});

const ResultActions = styled('div')({
  position: 'fixed',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  width: '100%',
  maxWidth: 280,
  display: 'flex',
  justifyContent: 'center',
  [DESKTOP_BREAKPOINT]: {
    maxWidth: 427,
    bottom: 32,
  },
});

function readStoredResult(key: string | undefined): number | null {
  if (!key) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    const value = raw === null ? Number.NaN : Number(raw);
    return Number.isInteger(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

function writeStoredResult(key: string | undefined, collected: number | null) {
  if (!key) return;
  try {
    if (collected === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, String(collected));
  } catch {
    return;
  }
}

type StationPhase = 'intro' | 'starting' | 'playing' | 'done';

interface ArStationProps {
  station: StationItemData;
  onComplete: (result: GameResult) => void;
  code?: string;
  textColor?: string;
}

export default function ArStation({ station, onComplete, code, textColor }: ArStationProps) {
  const t = useTranslations(texts);
  const settings = useMemo(() => arSettingsFrom(station.settings), [station.settings]);
  const resultKey = code ? `yooz_ar_${code}_${station._id}_${participantSessionId()}` : undefined;
  const [collected, setCollected] = useState<number | null>(() => readStoredResult(resultKey));
  const [phase, setPhase] = useState<StationPhase>(() => (collected === null ? 'intro' : 'done'));
  const [seed, setSeed] = useState(0);
  const [playedNow, setPlayedNow] = useState(false);
  const [xrSupported, setXrSupported] = useState(false);
  const [session, setSession] = useState<XRSession | null>(null);
  const [overlay, setOverlay] = useState<HTMLElement | null>(null);
  const [chime, setChime] = useState<CoinChime | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    let alive = true;
    loadPlayfield().catch(() => undefined);
    immersiveArSupported().then((supported) => {
      if (alive) setXrSupported(supported);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => () => overlay?.remove(), [overlay]);
  useEffect(() => () => chime?.close(), [chime]);

  const start = () => {
    requestMotionAccess();
    const root = overlay ?? document.body.appendChild(document.createElement('div'));
    setOverlay(root);
    if (!chime) setChime(createCoinChime());
    startedAtRef.current = Date.now();
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setPlayedNow(true);
    if (!xrSupported) {
      setSession(null);
      setPhase('playing');
      return;
    }
    setPhase('starting');
    startImmersiveAr(root).then((started) => {
      setSession(started);
      setPhase('playing');
    });
  };

  const handleFinish = (total: number) => {
    writeStoredResult(resultKey, total);
    setCollected(total);
    setPhase('done');
  };

  const handleExit = () => {
    setSession(null);
    setPlayedNow(false);
    setPhase('intro');
  };

  const handleContinue = () => {
    const total = collected ?? 0;
    const { score, maxPossibleScore } = arScore(total, settings);
    writeStoredResult(resultKey, null);
    onComplete({
      score,
      maxPossibleScore,
      durationMs: startedAtRef.current ? Date.now() - startedAtRef.current : 0,
      hintUsed: false,
      metadata: { coinsCollected: total, coinCount: settings.coinCount },
    });
  };

  const result = collected === null ? null : arScore(collected, settings);
  const allCollected = collected !== null && collected >= settings.coinCount;
  const showPlayfield = overlay && (phase === 'playing' || (phase === 'done' && playedNow && !session));

  return (
    <Wrap>
      <DesktopStationHeaderBand>
        <Title style={themedTitleInk(textColor)}>{settings.title || t.title}</Title>
      </DesktopStationHeaderBand>
      <Scene aria-hidden="true">
        <BigShadow />
        <SideShadow />
        <SmallShadow />
        <HeroCoin src="/images/ar-coin.svg" alt="" />
        <SideCoin src="/images/ar-coin-turned.svg" alt="" />
        <SmallCoin src="/images/ar-coin.svg" alt="" />
        <Sparkle style={{ left: '22%', top: 24, width: 22, height: 22 }} />
        <Sparkle style={{ right: '24%', top: 30, width: 16, height: 16, background: '#fff2a8', animationDelay: '-0.8s' }} />
        <Sparkle style={{ right: '10%', top: 150, width: 12, height: 12, animationDelay: '-1.4s' }} />
        <Sparkle style={{ left: '3%', top: 60, width: 11, height: 11, background: '#fff2a8', animationDelay: '-0.4s' }} />
      </Scene>
      <Bubble>
        <BubbleText>{settings.instructions || t.instructions}</BubbleText>
        <MetaRow>
          <MetaItem>
            <CoinDot />
            {t.coinsMeta(settings.coinCount)}
          </MetaItem>
          <MetaDivider />
          <MetaItem>
            <ClockFace />
            {t.secondsMeta(settings.timeLimitSeconds)}
          </MetaItem>
        </MetaRow>
      </Bubble>
      <Row>
        <PrimaryActionButton type="button" onClick={start} disabled={phase === 'starting'}>{t.start}</PrimaryActionButton>
      </Row>
      {showPlayfield && (
        <Suspense fallback={null}>
          <ArPlayfield
            key={seed}
            settings={settings}
            seed={seed}
            session={session}
            overlayRoot={overlay}
            chime={chime}
            onFinish={handleFinish}
            onExit={handleExit}
          />
        </Suspense>
      )}
      {phase === 'done' && result && createPortal(
        <>
          {allCollected && (
            <ConfettiLayer>
              <ConfettiOverlay />
            </ConfettiLayer>
          )}
          <ResultOverlay>
            <CelebrationScene aria-hidden="true">
              <CelebrationGlow />
              <HeroCoin src="/images/ar-coin.svg" alt="" style={{ top: 40, width: 120, height: 120, marginLeft: -60 }} />
              <SideCoin src="/images/ar-coin-turned.svg" alt="" style={{ top: 92, width: 64, height: 64 }} />
              <SmallCoin src="/images/ar-coin.svg" alt="" style={{ top: 84 }} />
              <Sparkle style={{ left: '26%', top: 34, width: 20, height: 20 }} />
              <Sparkle style={{ right: '22%', top: 40, width: 15, height: 15, background: '#fff2a8', animationDelay: '-0.8s' }} />
              <Sparkle style={{ right: '10%', top: 160, width: 12, height: 12, animationDelay: '-1.4s' }} />
              <Sparkle style={{ left: '12%', top: 70, width: 11, height: 11, background: '#fff2a8', animationDelay: '-0.4s' }} />
            </CelebrationScene>
            <ResultHeadline>{allCollected ? t.allTitle : t.timeUpTitle}</ResultHeadline>
            <ResultBox>
              <ResultLine>{allCollected ? t.collectedAllLine(settings.coinCount) : t.collectedLine(collected ?? 0, settings.coinCount)}</ResultLine>
              {result.score > 0 && (
                <ResultPoints>
                  <SignedNumber>+{result.score}</SignedNumber> {t.pointsWord}
                </ResultPoints>
              )}
              {result.bonus > 0 && <ResultBonus>{t.bonusLine(result.bonus)}</ResultBonus>}
              {settings.finishText && <ResultFinishText>{settings.finishText}</ResultFinishText>}
            </ResultBox>
            <ResultActions>
              <PrimaryActionButton type="button" onClick={handleContinue}>{t.continue}</PrimaryActionButton>
            </ResultActions>
          </ResultOverlay>
        </>,
        document.body,
      )}
    </Wrap>
  );
}
