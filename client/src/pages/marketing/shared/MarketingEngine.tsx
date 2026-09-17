import { styled } from '@mui/material/styles';
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
}

/** The band is entered through a wide point, not a curve. */
const Band = styled('section')({
  position: 'relative',
  background: C.bandPeach,
  paddingBottom: 30,
  [BP.mobile]: { paddingBottom: 16 },
});

/**
 * In normal flow, deliberately. Positioning this absolutely at `bottom: 100%`
 * gives it no layout height, so it draws over whatever section comes before and
 * clips that copy. Sitting in flow, it occupies its own height and separates the
 * two sections the way the frame does. Its area above the peak is transparent,
 * so the previous section's ground shows through.
 */
const ShapeWrap = styled('div')({ lineHeight: 0 });

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

/**
 * The cream ground the engine sits on.
 *
 * It is a flat-topped hexagon (`REGULAR_POLYGON` 459:7787 in the file), 1691
 * wide against a 1512 frame - so it bleeds past both edges - not the rotated
 * square an earlier pass used, which read as a pointed diamond. Path exported
 * from the file and inlined so it can stretch to any width.
 */
const Ground = styled('div')({
  position: 'relative',
  width: '100%',
  /**
   * Pulled up so the video's lower portion sits over the hexagon. In the frame
   * the video ends at y2485 and the hexagon starts at y2230, so roughly 255px of
   * the video overlaps it. The top padding then clears the video before the
   * boosters begin.
   */
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
  [BP.mobile]: { width: 168, height: 143, padding: '12px 14px' },
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
  [BP.mobile]: { fontSize: 12.5 },
});

export default function MarketingEngine({ videoUrl, posterUrl }: MarketingEngineProps) {
  const t = useTranslations(texts);

  return (
    <>
      <ShapeWrap>
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

          <Slot area="2 / 2 / 3 / 3" delay={120}>
            <Booster>
              <BoosterTitle>{t.share}</BoosterTitle>
              <BoosterDesc>{t.shareDesc}</BoosterDesc>
            </Booster>
          </Slot>
        </Stage>
      </Ground>
      </Band>
    </>
  );
}
