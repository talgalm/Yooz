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

const ShapeWrap = styled('div')({ position: 'absolute', insetInline: 0, bottom: '100%', lineHeight: 0 });

const Frame = styled('div')({
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
 * The cream diamond the engine sits on - a rotated square, so it scales cleanly
 * and picks up the token colour rather than shipping an image.
 */
const Diamond = styled('div')({
  position: 'relative',
  width: '100%',
  marginTop: -70,
  paddingBlock: '120px 90px',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 'min(1180px, 128vw)',
    height: 'min(1180px, 128vw)',
    background: '#FBE2BC',
    transform: 'translate(-50%, -50%) rotate(45deg)',
    borderRadius: 90,
    zIndex: 0,
  },
  [BP.mobile]: { marginTop: -30, paddingBlock: '60px 50px' },
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

const Infinity8 = styled('svg')({
  width: 'min(300px, 44vw)',
  height: 'auto',
  gridColumn: 2,
  gridRow: 1,
  animation: `${floatY} 6s ease-in-out infinite`,
  [REDUCED_MOTION]: { animation: 'none' },
  [BP.mobile]: { gridColumn: 1, width: 'min(230px, 58vw)' },
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
  width: 190,
  height: 190,
  borderRadius: '50%',
  background: '#FBC65A',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '20px 22px',
  boxSizing: 'border-box',
  transition: 'transform 0.2s ease',
  '&:hover': { transform: 'scale(1.05)' },
  [REDUCED_MOTION]: { transition: 'none', '&:hover': { transform: 'none' } },
  [BP.mobile]: { width: 164, height: 164, padding: '14px 16px' },
});

const BoosterTitle = styled('div')({
  fontSize: 15,
  fontWeight: 900,
  color: C.heading,
  marginBottom: 6,
  [BP.mobile]: { fontSize: 13.5 },
});

const BoosterDesc = styled('div')({
  fontSize: 11,
  lineHeight: 1.55,
  color: C.ink,
  [BP.mobile]: { fontSize: 10.5 },
});

export default function MarketingEngine({ videoUrl, posterUrl }: MarketingEngineProps) {
  const t = useTranslations(texts);

  return (
    <Band>
      <ShapeWrap>
        <SectionShape color={C.bandPeach} variant="chevron" height={130} />
      </ShapeWrap>

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

      <Diamond>
        <Stage>
          <Slot area="1 / 3 / 2 / 4" delay={60}>
            <Booster>
              <BoosterTitle>{t.stay}</BoosterTitle>
              <BoosterDesc>{t.stayDesc}</BoosterDesc>
            </Booster>
          </Slot>

          <Infinity8 viewBox="0 0 200 100" aria-hidden focusable="false">
            <defs>
              <linearGradient id="yoozInfinity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8A2BC0" />
                <stop offset="45%" stopColor="#6A0E9A" />
                <stop offset="100%" stopColor="#4E0A74" />
              </linearGradient>
            </defs>
            <path
              d="M50,50 C50,25 75,25 100,50 C125,75 150,75 150,50 C150,25 125,25 100,50 C75,75 50,75 50,50 Z"
              fill="none"
              stroke="url(#yoozInfinity)"
              strokeWidth="23"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Infinity8>

          <Slot area="1 / 1 / 2 / 2" delay={0}>
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
      </Diamond>
    </Band>
  );
}
