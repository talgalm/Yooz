import { useRef, useState } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './MarketingEngine.i18n';
import { C, SHADOW, BP, REDUCED_MOTION } from './tokens';
import { Container, H2 } from './styled';
import SectionShape from './SectionShape';
import Reveal from './Reveal';
import useStopWhenUnseen from './useStopWhenUnseen';

interface MarketingEngineProps {
  /** Looping clip shown in the device frame. Falls back to a still. */
  videoUrl?: string;
  posterUrl?: string;
  /**
   * The Yooz Auto Clip keepsake video, shown in a phone beside the Auto Clip
   * disc. Portrait, plays with sound on a tap. Omit to show the discs alone.
   */
  clipUrl?: string;
  clipPosterUrl?: string;
  /**
   * Colour of the section above, filling the chevron strip either side of the
   * peak. Both call sites - Business and Tourism - put this after a `C.paper`
   * band, which is the default.
   */
  shapeFrom?: string;
}

/** The band is entered through a wide point, not a curve. */
const Band = styled('section')({
  position: 'relative',
  background: C.bandPeach,
  paddingBottom: 30,
  [BP.mobile]: { paddingBottom: 16 },
});

/**
 * In normal flow, so it separates the two sections rather than overlaying the
 * one above. The area beside the peak is unpainted, so `from` has to carry the
 * previous band's colour or it reads as a white gap.
 */
const ShapeWrap = styled('div', { shouldForwardProp: (p) => p !== 'from' })<{ from?: string }>(({ from }) => ({
  lineHeight: 0,
  background: from ?? 'transparent',
}));

/**
 * Sits in front of the hexagon and overlaps into it. Without an explicit stacking
 * context the positioned `Ground` below wins simply by coming later in the DOM,
 * and the hexagon paints over the video.
 */
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

/**
 * The frame's own `zIndex` only holds once `Reveal` has finished: while the
 * wrapper still carries its lift transform it is a stacking context of its own,
 * and the cream hexagon below - later in the DOM - paints over the video until
 * the transform clears. Positioning the wrapper keeps the video on top
 * throughout, instead of letting it pop forward mid-animation.
 */
const VideoReveal = styled(Reveal)({ position: 'relative', zIndex: 2 });

const Media = styled('video')({ width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
const Still = styled('img')({ width: '100%', height: '100%', objectFit: 'cover', display: 'block' });

// ─── Keepsake phone ───

/**
 * A phone, tilted toward the Auto Clip disc it sits beside. Tilt mirrors with
 * direction so it always leans in: the phone is right of the disc under RTL,
 * left of it under LTR.
 */
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

/** The camera pill at the top of the screen. */
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

/** Same yellow as the booster discs, so the phone reads as the Auto Clip one. */
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

/**
 * Tap to play, with sound - the point of the clip is what a participant hears
 * and sees. Controls appear once it is running; the button returns when it stops.
 */
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
            {/* Points right in both directions - a transport control, not a reading cue. */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
              <path d="M8 5.2 19 12 8 18.8z" />
            </svg>
          </PlayButton>
        )}
      </Screen>
    </Phone>
  );
}

/**
 * The cream ground the engine sits on: a flat-topped hexagon
 * (`REGULAR_POLYGON` 459:7787), 1691 wide against a 1512 frame, so it bleeds
 * past both edges. Inlined from the file so it can stretch to any width.
 */
const Ground = styled('div')({
  position: 'relative',
  width: '100%',
  /** Video ends at y2485 and the hexagon starts at y2230, so 255px overlap. */
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

/**
 * Inlined from `engine-infinity.svg` so the ribbon can be animated; the file is
 * kept as the export. In the frame this is two stacked 43px strokes: a
 * 20%-opacity #FFBF4D halo beneath a #721BA0 ribbon, plus inset and drop
 * filters, which is why a single stroked path read as a plain ring. Native
 * 428x199, drawn with `overflow: visible` so the drop shadow is not clipped at
 * the viewBox edge.
 */
/**
 * One lap of the dash pattern. `pathLength="1"` makes a lap one unit, so a dash
 * plus its gap is one unit too and the offset slides through exactly one of
 * them per cycle - the ribbon keeps flowing rather than reopening at a fixed
 * point, and the linear timing is what keeps the travel even.
 */
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
    /** Most of the loop drawn; the short gap is the opening that travels. */
    strokeDasharray: '0.78 0.22',
    animation: `${flow} 6s linear infinite`,
  },
  [REDUCED_MOTION]: {
    /** Whole loop, drawn: the mark still has to read as an infinity. */
    '& .engine-ribbon': { strokeDasharray: 'none', animation: 'none' },
  },
  [BP.mobile]: { gridColumn: 1, width: 'min(280px, 62vw)' },
});

/** The one path both strokes trace. */
const INFINITY_PATH =
  'M308.327 25.0247C356.388 10.2104 402.5 56.4381 402.5 95.1858C402.5 133.934 356.388 180.161 308.327 165.347C246.745 146.365 179.564 46.8043 119.673 25.0247C72.9336 8.02853 25.5 56.4381 25.5 95.1858C25.5 133.934 72.9336 182.343 119.673 165.347C179.564 143.567 246.745 44.007 308.327 25.0247Z';

/**
 * The mark. The ribbon is drawn with one short gap in it, and the gap travels
 * the loop continuously - so the opening is always somewhere else and the
 * motion never restarts from a fixed point.
 */
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
          /* Rounded while it is mid-draw; the closed path hides them when full. */
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

/**
 * Grid placement has to live on the `Reveal` wrapper, not the disc: `Reveal`
 * renders the element that is actually the grid item.
 */
const Slot = styled(Reveal, { shouldForwardProp: (p) => p !== 'area' })<{ area: string }>(({ area }) => ({
  gridArea: area,
  display: 'flex',
  justifyContent: 'center',
  [BP.mobile]: { gridArea: 'auto' },
}));

/**
 * The Auto Clip disc hugs the top of its row. The phone beside it is taller, and
 * centring would push the disc down away from the other two.
 */
const ClipSlot = styled(Slot)({ alignSelf: 'start' });

/**
 * The phone's cell: under Stay, beside the Auto Clip disc. Grid columns follow
 * `direction`, so column 1 is the right under RTL; `end` then pushes it toward
 * the centre column, and the negative end margin pulls it in closer to the disc.
 * The top padding clears the badge from the Stay disc above. On a phone the grid
 * is one column and this simply follows the disc.
 */
const PhoneSlot = styled(Reveal)({
  gridArea: '2 / 1 / 3 / 2',
  justifySelf: 'end',
  alignSelf: 'start',
  paddingTop: 18,
  marginInlineEnd: -48,
  [BP.mobile]: { gridArea: 'auto', justifySelf: 'center', marginInlineEnd: 0, paddingTop: 14 },
});

const Booster = styled('div')({
  /**
   * The frame's ellipse is 192x163, but its text frame is 215 wide - i.e. the
   * copy is allowed to run wider than the ellipse. Rendering both at 192 with
   * generous padding left only 148px for a 24px title, so "Spend Booster"
   * wrapped and the body overflowed. Enlarged, with the padding pulled in.
   */
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
  /**
   * Scaled off the current base, not the old one. 168 was set against the 192
   * ellipse this grew from; kept against 228 it reproduces exactly the wrap that
   * forced the enlargement, since "Spend Booster" needs the width.
   */
  [BP.mobile]: { width: 200, height: 170, padding: '14px 15px' },
});

/** 24 / 500 / 28.4 in the file, with only a 2px gap to the body beneath it. */
const BoosterTitle = styled('div')({
  fontSize: 24,
  fontWeight: 500,
  lineHeight: 1.18,
  color: C.heading,
  marginBottom: 2,
  [BP.mobile]: { fontSize: 18 },
});

/** 16 / 400 / 19. */
const BoosterDesc = styled('div')({
  fontSize: 16,
  lineHeight: 1.19,
  color: C.ink,
  [BP.mobile]: { fontSize: 13.5 },
});

export default function MarketingEngine({ videoUrl, posterUrl, clipUrl, clipPosterUrl, shapeFrom = C.paper }: MarketingEngineProps) {
  const t = useTranslations(texts);
  const parkRef = useRef<HTMLVideoElement>(null);
  /**
   * It loops, so it must not pause off-screen - it would freeze on a frame.
   * The unmount stop still matters: the controls let a visitor unmute it.
   */
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
              /* Muted autoplay, but with controls: it is a video, so it has to be pausable. */
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
          {/* Stay sits left (instance at x222), Spend right (x968). */}
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

          {/* What the Auto Clip disc describes, playable, right beside it. */}
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
