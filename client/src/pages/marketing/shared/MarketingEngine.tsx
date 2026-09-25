import { useRef, useState } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './MarketingEngine.i18n';
import { C, SHADOW, BP, REDUCED_MOTION } from './tokens';
import { Container, H2 } from './styled';
import SectionShape from './SectionShape';
import Reveal from './Reveal';
import useStopWhenUnseen from './useStopWhenUnseen';
import { PlayGlyph } from './MarketingEngine.icons';

interface MarketingEngineProps {
  videoUrl?: string;
  posterUrl?: string;
  clipUrl?: string;
  clipPosterUrl?: string;
  shapeFrom?: string;
}

const Band = styled('section')({
  position: 'relative',
  background: C.bandPeach,
  paddingBottom: 30,
  [BP.mobile]: { paddingBottom: 16 },
});

const ShapeWrap = styled('div', { shouldForwardProp: (p) => p !== 'from' })<{ from?: string }>(({ from }) => ({
  lineHeight: 0,
  background: from ?? 'transparent',
}));

const Frame = styled('div')({
  position: 'relative',
  zIndex: 2,
  width: 'min(700px, 100%)',
  marginInline: 'auto',
  marginTop: 34,
  borderRadius: 34,
  border: `9px solid ${C.purple}`,
  background: C.heading,
  overflow: 'hidden',
  boxShadow: SHADOW.float,
  aspectRatio: '16 / 10',
  display: 'flex',
  [BP.mobile]: { borderWidth: 6, borderRadius: 24, marginTop: 20 },
});

const VideoReveal = styled(Reveal)({ position: 'relative', zIndex: 2 });

const Media = styled('video')({ width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
const Still = styled('img')({ width: '100%', height: '100%', objectFit: 'cover', display: 'block' });

const Phone = styled('figure')({
  position: 'relative',
  width: 200,
  margin: 0,
  padding: 9,
  borderRadius: 38,
  background: '#1B0E24',
  boxShadow: `0 0 0 3px ${C.purple}, ${SHADOW.float}`,
  transform: 'rotate(-3deg)',
  transition: 'transform 0.3s ease',
  '[dir="ltr"] &': { transform: 'rotate(3deg)' },
  '&:hover': { transform: 'rotate(0deg) translateY(-6px)' },
  [BP.tablet]: { width: 180 },
  [BP.mobile]: { width: 'min(190px, 50vw)', padding: 7, borderRadius: 32 },
  [REDUCED_MOTION]: { transition: 'none', transform: 'none', '[dir="ltr"] &': { transform: 'none' }, '&:hover': { transform: 'none' } },
});

const Notch = styled('span')({
  position: 'absolute',
  top: 17,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 64,
  height: 17,
  borderRadius: 999,
  background: '#1B0E24',
  zIndex: 2,
});

const Screen = styled('div')({
  position: 'relative',
  borderRadius: 31,
  overflow: 'hidden',
  aspectRatio: '9 / 16',
  background: C.heading,
});

const ClipVideo = styled('video')({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
});

const ClipBadge = styled('figcaption')({
  position: 'absolute',
  top: -15,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 3,
  whiteSpace: 'nowrap',
  background: '#FFBF4D',
  color: C.heading,
  fontSize: 14,
  fontWeight: 800,
  padding: '7px 16px',
  borderRadius: 999,
  boxShadow: SHADOW.card,
  pointerEvents: 'none',
});

const pulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(255,191,77,0.75); }
  70%  { box-shadow: 0 0 0 18px rgba(255,191,77,0); }
  100% { box-shadow: 0 0 0 0 rgba(255,191,77,0); }
`;

const PlayButton = styled('button')({
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 2,
  width: 68,
  height: 68,
  padding: 0,
  border: 'none',
  borderRadius: '50%',
  cursor: 'pointer',
  background: 'rgba(255,255,255,0.94)',
  color: C.purple,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: `${pulse} 2.2s ease-out infinite`,
  transition: 'transform 0.16s ease',
  '&:hover': { transform: 'translate(-50%, -50%) scale(1.08)' },
  '&:focus-visible': { outline: `3px solid ${C.amber}`, outlineOffset: 4 },
  [REDUCED_MOTION]: { animation: 'none', transition: 'none', '&:hover': { transform: 'translate(-50%, -50%)' } },
});

function KeepsakePhone({ src, poster, label, alt, playLabel }: {
  src: string;
  poster?: string;
  label: string;
  alt: string;
  playLabel: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useStopWhenUnseen(videoRef, { src });

  return (
    <Phone>
      <ClipBadge>{label}</ClipBadge>
      <Notch aria-hidden />
      <Screen>
        <ClipVideo
          ref={videoRef}
          src={src}
          poster={poster}
          playsInline
          preload="none"
          controls={playing}
          aria-label={alt}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
        {!playing && (
          <PlayButton type="button" onClick={() => videoRef.current?.play()} aria-label={playLabel}>
            <PlayGlyph />
          </PlayButton>
        )}
      </Screen>
    </Phone>
  );
}

const Ground = styled('div')({
  position: 'relative',
  width: '100%',
  marginTop: -255,
  paddingBlock: '330px 120px',
  [BP.mobile]: { marginTop: -90, paddingBlock: '130px 60px' },
});

const GroundSvg = styled('svg')({
  position: 'absolute',
  insetInline: '-6%',
  top: 0,
  width: '112%',
  height: '100%',
  zIndex: 0,
  pointerEvents: 'none',
});

const Stage = styled('div')({
  position: 'relative',
  zIndex: 1,
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  gridTemplateRows: 'auto auto',
  justifyItems: 'center',
  alignItems: 'center',
  gap: '10px 18px',
  maxWidth: 940,
  marginInline: 'auto',
  [BP.mobile]: { gridTemplateColumns: '1fr', gap: 16 },
});

const flow = keyframes`
  to { stroke-dashoffset: -1; }
`;

const Infinity8 = styled('svg')({
  width: 'min(377px, 42vw)',
  height: 'auto',
  gridColumn: 2,
  gridRow: 1,
  overflow: 'visible',
  '& .engine-ribbon': {
    strokeDasharray: '0.78 0.22',
    animation: `${flow} 6s linear infinite`,
  },
  [REDUCED_MOTION]: {
    '& .engine-ribbon': { strokeDasharray: 'none', animation: 'none' },
  },
  [BP.mobile]: { gridColumn: 1, width: 'min(280px, 62vw)' },
});

const INFINITY_PATH =
  'M308.327 25.0247C356.388 10.2104 402.5 56.4381 402.5 95.1858C402.5 133.934 356.388 180.161 308.327 165.347C246.745 146.365 179.564 46.8043 119.673 25.0247C72.9336 8.02853 25.5 56.4381 25.5 95.1858C25.5 133.934 72.9336 182.343 119.673 165.347C179.564 143.567 246.745 44.007 308.327 25.0247Z';

function InfinityMark() {

  return (
    <Infinity8 viewBox="0 0 428 199" fill="none" aria-hidden focusable="false">
      <g filter="url(#engineInfinityInner)">
        <path
          d={INFINITY_PATH}
          stroke="#FFBF4D"
          strokeOpacity="0.2"
          strokeWidth="43"
          strokeMiterlimit="10"
          strokeLinejoin="round"
        />
        <path
          className="engine-ribbon"
          filter="url(#engineInfinityRibbon)"
          d={INFINITY_PATH}
          pathLength="1"
          stroke="#721BA0"
          strokeWidth="43"
          strokeMiterlimit="10"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <filter
          id="engineInfinityInner"
          x="-20"
          y="-20"
          width="468"
          height="239"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow" />
        </filter>
        <filter
          id="engineInfinityRibbon"
          x="-20"
          y="-20"
          width="468"
          height="239"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="8" />
          <feGaussianBlur stdDeviation="1.85" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="effect2_innerShadow" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="-6" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="effect2_innerShadow" result="effect3_innerShadow" />
        </filter>
      </defs>
    </Infinity8>
  );
}

const Slot = styled(Reveal, { shouldForwardProp: (p) => p !== 'area' })<{ area: string }>(({ area }) => ({
  gridArea: area,
  display: 'flex',
  justifyContent: 'center',
  [BP.mobile]: { gridArea: 'auto' },
}));

const ClipSlot = styled(Slot)({ alignSelf: 'start' });

const PhoneSlot = styled(Reveal)({
  gridArea: '2 / 1 / 3 / 2',
  justifySelf: 'end',
  alignSelf: 'start',
  paddingTop: 18,
  marginInlineEnd: -48,
  [BP.mobile]: { gridArea: 'auto', justifySelf: 'center', marginInlineEnd: 0, paddingTop: 14 },
});

const Booster = styled('div')({
  width: 228,
  height: 194,
  borderRadius: '50%',
  background: '#FFBF4D',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '18px 16px',
  boxSizing: 'border-box',
  transition: 'transform 0.2s ease',
  '&:hover': { transform: 'scale(1.05)' },
  [REDUCED_MOTION]: { transition: 'none', '&:hover': { transform: 'none' } },
  [BP.mobile]: { width: 200, height: 170, padding: '14px 15px' },
});

const BoosterTitle = styled('div')({
  fontSize: 24,
  fontWeight: 500,
  lineHeight: 1.18,
  color: C.heading,
  marginBottom: 2,
  [BP.mobile]: { fontSize: 18 },
});

const BoosterDesc = styled('div')({
  fontSize: 16,
  lineHeight: 1.19,
  color: C.ink,
  [BP.mobile]: { fontSize: 13.5 },
});

export default function MarketingEngine({ videoUrl, posterUrl, clipUrl, clipPosterUrl, shapeFrom = C.paper }: MarketingEngineProps) {
  const t = useTranslations(texts);
  const parkRef = useRef<HTMLVideoElement>(null);
  useStopWhenUnseen(parkRef, { offscreen: false });

  return (
    <>
      <ShapeWrap from={shapeFrom}>
        <SectionShape color={C.bandPeach} variant="chevron" height={130} />
      </ShapeWrap>

      <Band>
      <Container>
        <H2>{t.title}</H2>
        <VideoReveal>
          <Frame>
            {videoUrl ? (
              <Media
                ref={parkRef}
                src={videoUrl}
                poster={posterUrl}
                autoPlay
                muted
                loop
                controls
                playsInline
                aria-label={t.videoAlt}
              />
            ) : posterUrl ? (
              <Still src={posterUrl} alt={t.videoAlt} loading="lazy" />
            ) : null}
          </Frame>
        </VideoReveal>
      </Container>

      <Ground>
        <GroundSvg viewBox="0 0 1512 841" preserveAspectRatio="none" aria-hidden focusable="false">
          <path
            d="M722.515 8.00924C743.561 -2.66959 768.439 -2.66959 789.486 8.00924L1471.48 354.048C1525.51 381.46 1525.51 458.627 1471.48 486.039L789.486 832.078C768.439 842.757 743.561 842.757 722.515 832.078L40.5189 486.039C-13.5062 458.627 -13.5062 381.46 40.519 354.048L722.515 8.00924Z"
            fill="#FDE0C0"
          />
        </GroundSvg>

        <Stage>
          <Slot area="1 / 1 / 2 / 2" delay={0}>
            <Booster>
              <BoosterTitle>{t.stay}</BoosterTitle>
              <BoosterDesc>{t.stayDesc}</BoosterDesc>
            </Booster>
          </Slot>

          <InfinityMark />

          <Slot area="1 / 3 / 2 / 4" delay={60}>
            <Booster>
              <BoosterTitle>{t.spend}</BoosterTitle>
              <BoosterDesc>{t.spendDesc}</BoosterDesc>
            </Booster>
          </Slot>

          <ClipSlot area="2 / 2 / 3 / 3" delay={120}>
            <Booster>
              <BoosterTitle>{t.share}</BoosterTitle>
              <BoosterDesc>{t.shareDesc}</BoosterDesc>
            </Booster>
          </ClipSlot>

          {clipUrl && (
            <PhoneSlot delay={180}>
              <KeepsakePhone
                src={clipUrl}
                poster={clipPosterUrl}
                label={t.share}
                alt={t.clipAlt}
                playLabel={t.clipPlay}
              />
            </PhoneSlot>
          )}
        </Stage>
      </Ground>
      </Band>
    </>
  );
}
