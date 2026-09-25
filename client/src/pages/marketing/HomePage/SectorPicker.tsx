import { Link } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts as navTexts } from '../shared/Nav.i18n';
import { texts } from './SectorPicker.i18n';
import Reveal from '../shared/Reveal';
import { ArrowGlyph } from '../shared/FeatureSplit';
import { Band, Container, H2 } from '../shared/styled';
import { C, SHADOW, RADIUS, BP, REDUCED_MOTION, SECTORS_GRADIENT } from '../shared/tokens';

type SectorKey = 'business' | 'academy' | 'tourism';

interface Sector {
  key: SectorKey;
  path: string;
  photo: string;
}

const SECTORS: Sector[] = [
  { key: 'business', path: '/business', photo: '/images/marketing/sector-business.jpg' },
  { key: 'tourism', path: '/tourism', photo: '/images/marketing/sector-tourism.jpg' },
  { key: 'academy', path: '/academy', photo: '/images/marketing/sector-academy.jpg' },
];

const HOVER = '@media (hover: hover) and (min-width: 701px)';

const Row = styled('div')({
  display: 'flex',
  gap: 16,
  height: 340,
  [BP.tablet]: { height: 280 },
  [HOVER]: {
    '&:hover > a:not(:hover) img': { filter: 'saturate(0.5) brightness(0.72)' },
  },
  [BP.mobile]: { flexDirection: 'column', height: 'auto', gap: 12 },
});

const Tile = styled(Link)({
  position: 'relative',
  flex: 1,
  minWidth: 0,
  display: 'block',
  borderRadius: RADIUS.frame,
  overflow: 'hidden',
  color: C.white,
  textDecoration: 'none',
  background: C.heading,
  boxShadow: SHADOW.card,
  transition: 'flex 0.55s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease',
  '&:focus-visible': { outline: `3px solid ${C.purple}`, outlineOffset: 4 },
  [HOVER]: {
    '&:hover, &:focus-visible': { flex: 1.7, boxShadow: SHADOW.float },
    '&:hover img, &:focus-visible img': { transform: 'scale(1.05)' },
    '&:hover [data-arrow], &:focus-visible [data-arrow]': { background: C.white, color: C.purple },
  },
  [BP.mobile]: { flex: 'none', height: 180, borderRadius: 22 },
  [REDUCED_MOTION]: { transition: 'none' },
});

const Photo = styled('img')({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
  transition: 'filter 0.4s ease, transform 0.9s ease',
  [REDUCED_MOTION]: { transition: 'none' },
});

const Shade = styled('span')({
  position: 'absolute',
  inset: 0,
  background:
    'linear-gradient(to top, rgba(56,8,80,0.88) 0%, rgba(56,8,80,0.42) 42%, rgba(56,8,80,0) 72%)',
});

const Foot = styled('span')({
  position: 'absolute',
  insetInline: 24,
  bottom: 22,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 14,
  [BP.mobile]: { insetInline: 18, bottom: 16 },
});

const Text = styled('span')({ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 });

const Label = styled('span')({
  fontSize: 'clamp(22px, 2.2vw, 30px)',
  fontWeight: 900,
  lineHeight: 1.2,
  [BP.mobile]: { fontSize: 23 },
});

const Tagline = styled('span')({
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.45,
  textShadow: '0 1px 8px rgba(56,8,80,0.6)',
});

const ArrowDisc = styled('span')({
  width: 46,
  height: 46,
  borderRadius: '50%',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: C.white,
  border: '1.5px solid rgba(255,255,255,0.8)',
  boxSizing: 'border-box',
  transition: 'background 0.25s ease, color 0.25s ease',
  [BP.mobile]: { width: 40, height: 40 },
  [REDUCED_MOTION]: { transition: 'none' },
});

export default function SectorPicker() {
  const t = useTranslations(texts);
  const nav = useTranslations(navTexts);

  return (
    <Band style={{ background: SECTORS_GRADIENT, paddingBlock: '88px 96px' }}>
      <Container>
        <H2 style={{ marginBottom: 'clamp(28px, 3.4vw, 44px)' }}>{t.title}</H2>

        <Reveal>
          <Row>
            {SECTORS.map((s) => (
              <Tile key={s.key} to={s.path}>
                <Photo src={s.photo} alt="" loading="lazy" />
                <Shade aria-hidden />
                <Foot>
                  <Text>
                    <Label>{nav[s.key]}</Label>
                    <Tagline>{t.taglines[s.key]}</Tagline>
                  </Text>
                  <ArrowDisc data-arrow aria-hidden>
                    <ArrowGlyph />
                  </ArrowDisc>
                </Foot>
              </Tile>
            ))}
          </Row>
        </Reveal>
      </Container>
    </Band>
  );
}
