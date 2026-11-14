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
import { arHints, arScore, arSettingsFrom, arTargetCount, hasSuitcaseInside, type ArHuntMode } from '../../utils/arStation';
import { createArSound, immersiveArSupported, requestMotionAccess, startImmersiveAr, type ArSound } from '../../utils/arSensors';
import ConfettiOverlay from './ConfettiOverlay';

const loadPlayfield = () => import('./ArPlayfield');
const ArPlayfield = lazy(loadPlayfield);

const COLLECT_SOUND: Record<ArHuntMode, string> = {
  coins: '/sounds/ar-coin.wav',
  suitcase: '/sounds/ar-suitcase.wav',
};
const PING_SOUND = '/sounds/ar-ping.wav';
const CODE_TILES_PATTERN = /^[0-9A-Za-z]{1,8}$/;

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

const RulesText = styled('p')({
  position: 'relative',
  margin: '8px 0 0',
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.45,
  color: '#2c3a22',
});

const SafetyLine = styled('div')({
  marginTop: 8,
  fontSize: 12.5,
  fontWeight: 600,
  color: '#7a8a6e',
});

const SuitcaseHero = styled(FloatingCoin)({
  left: '50%',
  width: 150,
  height: 125,
  marginLeft: -75,
  animation: `${coinFloat} 3s ease-in-out infinite`,
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
  width: 17,
  height: 17,
  background: 'url(/images/ar-coin-3d.webp) center / contain no-repeat',
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

const revealUp = keyframes`
  0% { transform: translateY(18px) scale(0.92); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
`;

const InsideCard = styled('div')({
  position: 'relative',
  width: '100%',
  maxWidth: 330,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  background: '#fffaf0',
  border: '3px solid #ffcf33',
  borderRadius: 22,
  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.3)',
  textAlign: 'center',
  flexShrink: 1,
  animation: `${revealUp} 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) 0.25s both`,
  ...calmMotion,
  [DESKTOP_BREAKPOINT]: {
    maxWidth: 440,
  },
});

const InsideTab = styled('div')({
  position: 'absolute',
  top: -16,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '5px 16px',
  borderRadius: 999,
  background: '#ffcf33',
  color: '#3b2a0a',
  fontSize: 14,
  fontWeight: 900,
  whiteSpace: 'nowrap',
  boxShadow: '0 3px 0 #d98a00',
});

const InsideBody = styled('div')({
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  padding: '24px 16px 14px',
  overflowY: 'auto',
});

const InsideImage = styled('img')({
  display: 'block',
  flex: '0 1 auto',
  width: '100%',
  minHeight: 64,
  maxHeight: 170,
  objectFit: 'contain',
  borderRadius: 12,
  marginBottom: 10,
});

const InsideScore = styled('div')({
  flex: 'none',
  marginTop: 12,
  paddingTop: 10,
  borderTop: '1px dashed #e7dcc0',
  fontSize: 24,
  fontWeight: 900,
  color: '#e09a00',
});

const InsideText = styled('p')({
  margin: 0,
  fontSize: 17,
  fontWeight: 800,
  lineHeight: 1.45,
  color: '#23301b',
  whiteSpace: 'pre-line',
});

const CodeBlock = styled('div')({
  marginTop: 12,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
});

const CodeLabel = styled('div')({
  fontSize: 13,
  fontWeight: 700,
  color: '#8a7a55',
});

const CodeTiles = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 6,
  direction: 'ltr',
});

const CodeTile = styled('span')({
  minWidth: 32,
  height: 40,
  padding: '0 6px',
  borderRadius: 9,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  background: '#1d0838',
  color: '#ffd54f',
  fontSize: 24,
  fontWeight: 900,
  boxShadow: 'inset 0 -3px 0 rgba(255, 255, 255, 0.12)',
});

const CodeText = styled('span')({
  maxWidth: '100%',
  padding: '8px 16px',
  borderRadius: 12,
  background: '#1d0838',
  color: '#ffd54f',
  fontSize: 22,
  fontWeight: 900,
  overflowWrap: 'anywhere',
  unicodeBidi: 'plaintext',
});

const ResultActions = styled('div')({
  position: 'fixed',
  zIndex: 1401,
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
  const [sound, setSound] = useState<ArSound | null>(null);
  const [ping, setPing] = useState<ArSound | null>(null);
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
  useEffect(() => () => sound?.close(), [sound]);
  useEffect(() => () => ping?.close(), [ping]);

  const start = () => {
    requestMotionAccess();
    const root = overlay ?? document.body.appendChild(document.createElement('div'));
    setOverlay(root);
    if (!sound) setSound(createArSound(COLLECT_SOUND[settings.mode]));
    if (!ping && arHints(settings) === 'hotCold') setPing(createArSound(PING_SOUND));
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
      metadata: { mode: settings.mode, collected: total, targets: arTargetCount(settings), hints: arHints(settings) },
    });
  };

  const suitcase = settings.mode === 'suitcase';
  const targetTotal = arTargetCount(settings);
  const result = collected === null ? null : arScore(collected, settings);
  const allCollected = collected !== null && collected >= targetTotal;
  const rules = suitcase ? t.rulesSuitcase : t.rulesCoins;
  const resultTitle = allCollected ? (suitcase ? t.foundTitle : t.allTitle) : t.timeUpTitle;
  const resultLine = suitcase
    ? (allCollected ? t.foundLine : t.notFoundLine)
    : allCollected ? t.collectedAllLine(targetTotal) : t.collectedLine(collected ?? 0, targetTotal);
  const showPlayfield = overlay && (phase === 'playing' || (phase === 'done' && playedNow && !session));
  const hints = arHints(settings);
  const opened = suitcase && allCollected && hasSuitcaseInside(settings);
  const insideCode = settings.insideCode.trim();

  return (
    <Wrap>
      <DesktopStationHeaderBand>
        <Title style={themedTitleInk(textColor)}>{settings.title || (suitcase ? t.suitcaseTitle : t.title)}</Title>
      </DesktopStationHeaderBand>
      <Scene aria-hidden="true" style={{ height: 176 }}>
        <BigShadow style={{ top: 168 }} />
        {suitcase ? (
          <SuitcaseHero src="/images/ar-suitcase.svg" alt="" style={{ top: 28 }} />
        ) : (
          <>
            <SideShadow style={{ top: 158 }} />
            <SmallShadow style={{ top: 150 }} />
            <HeroCoin src="/images/ar-coin-3d.webp" alt="" style={{ top: 16, width: 116, height: 116, marginLeft: -58 }} />
            <SideCoin src="/images/ar-coin-3d-turned.webp" alt="" style={{ top: 70, width: 56, height: 56 }} />
            <SmallCoin src="/images/ar-coin-3d-tilt.webp" alt="" style={{ top: 60, width: 48, height: 48 }} />
          </>
        )}
        <Sparkle style={{ left: '22%', top: 14, width: 20, height: 20 }} />
        <Sparkle style={{ right: '24%', top: 20, width: 15, height: 15, background: '#fff2a8', animationDelay: '-0.8s' }} />
        <Sparkle style={{ right: '10%', top: 120, width: 12, height: 12, animationDelay: '-1.4s' }} />
        <Sparkle style={{ left: '3%', top: 50, width: 11, height: 11, background: '#fff2a8', animationDelay: '-0.4s' }} />
      </Scene>
      <Bubble>
        <BubbleText>{settings.instructions || t.howToPlay}</BubbleText>
        <RulesText>{rules}</RulesText>
        <MetaRow>
          <MetaItem>
            {!suitcase && <CoinDot />}
            {suitcase ? t.suitcaseMeta : t.coinsMeta(settings.coinCount)}
          </MetaItem>
          <MetaDivider />
          <MetaItem>
            <ClockFace />
            {t.secondsMeta(settings.timeLimitSeconds)}
          </MetaItem>
          {hints !== 'map' && (
            <>
              <MetaDivider />
              <MetaItem>{hints === 'hotCold' ? t.hotColdMeta : t.noMapMeta}</MetaItem>
            </>
          )}
        </MetaRow>
        <SafetyLine>{t.safety}</SafetyLine>
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
            sound={sound}
            ping={ping}
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
          <ResultOverlay style={opened ? { overflowY: 'hidden', padding: '20px 16px 108px' } : undefined}>
            <CelebrationScene aria-hidden="true" style={opened ? { height: 124 } : undefined}>
              <CelebrationGlow />
              {opened ? (
                <SuitcaseHero src="/images/ar-suitcase-open.svg" alt="" style={{ top: 0, width: 132, height: 121, marginLeft: -66 }} />
              ) : suitcase ? (
                <SuitcaseHero src="/images/ar-suitcase.svg" alt="" style={{ top: 44 }} />
              ) : (
                <>
                  <HeroCoin src="/images/ar-coin-3d.webp" alt="" style={{ top: 40, width: 120, height: 120, marginLeft: -60 }} />
                  <SideCoin src="/images/ar-coin-3d-turned.webp" alt="" style={{ top: 92, width: 64, height: 64 }} />
                  <SmallCoin src="/images/ar-coin-3d-tilt.webp" alt="" style={{ top: 84 }} />
                </>
              )}
              <Sparkle style={{ left: '26%', top: 34, width: 20, height: 20 }} />
              <Sparkle style={{ right: '22%', top: 40, width: 15, height: 15, background: '#fff2a8', animationDelay: '-0.8s' }} />
              {!opened && <Sparkle style={{ right: '10%', top: 160, width: 12, height: 12, animationDelay: '-1.4s' }} />}
              <Sparkle style={{ left: '12%', top: 70, width: 11, height: 11, background: '#fff2a8', animationDelay: '-0.4s' }} />
            </CelebrationScene>
            <ResultHeadline style={opened ? { margin: '0 0 24px', fontSize: 34 } : undefined}>{resultTitle}</ResultHeadline>
            {opened && (
              <InsideCard>
                <InsideTab>{t.insideLabel}</InsideTab>
                <InsideBody>
                  {settings.insideImageUrl && <InsideImage src={settings.insideImageUrl} alt="" />}
                  {settings.insideText && <InsideText>{settings.insideText}</InsideText>}
                  {insideCode && (
                    <CodeBlock>
                      <CodeLabel>{t.insideCodeLabel}</CodeLabel>
                      {CODE_TILES_PATTERN.test(insideCode) ? (
                        <CodeTiles>
                          {[...insideCode].map((char, index) => (
                            <CodeTile key={index}>{char}</CodeTile>
                          ))}
                        </CodeTiles>
                      ) : (
                        <CodeText>{insideCode}</CodeText>
                      )}
                    </CodeBlock>
                  )}
                  {settings.finishText && <ResultFinishText>{settings.finishText}</ResultFinishText>}
                  {result.score > 0 && (
                    <InsideScore>
                      <SignedNumber>+{result.score}</SignedNumber> {t.pointsWord}
                    </InsideScore>
                  )}
                </InsideBody>
              </InsideCard>
            )}
            {!opened && (
              <ResultBox>
                <ResultLine>{resultLine}</ResultLine>
                {result.score > 0 && (
                  <ResultPoints>
                    <SignedNumber>+{result.score}</SignedNumber> {t.pointsWord}
                  </ResultPoints>
                )}
                {result.bonus > 0 && <ResultBonus>{t.bonusLine(result.bonus)}</ResultBonus>}
                {settings.finishText && <ResultFinishText>{settings.finishText}</ResultFinishText>}
              </ResultBox>
            )}
          </ResultOverlay>
          <ResultActions>
            <PrimaryActionButton type="button" onClick={handleContinue}>{t.continue}</PrimaryActionButton>
          </ResultActions>
        </>,
        document.body,
      )}
    </Wrap>
  );
}
