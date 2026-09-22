import { useRef, useState } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './MarketingEngine.i18n';
import { C, SHADOW, BP, REDUCED_MOTION } from './tokens';
import { Container, H2, floatY } from './styled';
import SectionShape from './SectionShape';
import Reveal from './Reveal';

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
 * Shipped as a file, not inlined: in the frame this is two stacked 43px strokes
 * - a 20%-opacity #FFBF4D halo beneath a #721BA0 ribbon - plus inset and drop
 * filters. A single stroked path cannot reproduce it, which is why earlier
 * versions read as a plain ring. Native 428x199.
 */
const Infinity8 = styled('img')({
  width: 'min(377px, 42vw)',
  height: 'auto',
  gridColumn: 2,
  gridRow: 1,
  animation: `${floatY} 6s ease-in-out infinite`,
  [REDUCED_MOTION]: { animation: 'none' },
  [BP.mobile]: { gridColumn: 1, width: 'min(280px, 62vw)' },
});

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

  return (
    <>
      <ShapeWrap from={shapeFrom}>
        <SectionShape color={C.bandPeach} variant="chevron" height={130} />
      </ShapeWrap>

      <Band>
      <Container>
        <H2>{t.title}</H2>
        <Reveal>
          <Frame>
            {videoUrl ? (
              <Media src={videoUrl} poster={posterUrl} autoPlay muted loop playsInline aria-label={t.videoAlt} />
            ) : posterUrl ? (
              <Still src={posterUrl} alt={t.videoAlt} loading="lazy" />
            ) : null}
          </Frame>
        </Reveal>
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

          <Infinity8 src="/images/marketing/engine-infinity.svg" alt="" aria-hidden />

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
