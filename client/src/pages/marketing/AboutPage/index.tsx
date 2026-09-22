import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AboutPage.i18n';
import Reveal from '../shared/Reveal';
import SoftBlob from '../shared/SoftBlob';
import { Band, Container, GradientText } from '../shared/styled';
import { C, SHADOW, RADIUS, BP } from '../shared/tokens';

const Root = styled(Band)({
  position: 'relative',
  overflow: 'hidden',
  paddingBlock: '72px 96px',
  [BP.mobile]: { paddingBlock: '40px 56px' },
});

/** Same washes the hero uses, sat behind the portrait side of the split. */
const BlobField = styled('div')({
  position: 'absolute',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
});

/**
 * Portrait on one side, the story on the other. Under RTL the first grid child
 * lands on the right, so the copy comes first in the DOM - which is also the
 * order a phone should stack them in.
 */
const Split = styled('div')({
  position: 'relative',
  zIndex: 1,
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 44,
  alignItems: 'start',
  '@media (min-width: 901px)': { gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 64 },
});

const Copy = styled('div')({ textAlign: 'start', maxWidth: 680 });

/**
 * The site's heading colour, ranged left with the text rather than centred -
 * this page reads as one letter rather than a stack of sections.
 */
const Title = styled('h2')({
  position: 'relative',
  fontSize: 'clamp(24px, 2.6vw, 34px)',
  fontWeight: 900,
  lineHeight: 1.2,
  color: C.heading,
  margin: '0 0 16px',
  '&:not(:first-of-type)': { marginTop: 52 },
});

const Lead = styled('p')({
  margin: '0 0 16px',
  fontSize: 'clamp(17px, 1.5vw, 20px)',
  fontWeight: 700,
  lineHeight: 1.6,
  color: C.heading,
});

const Para = styled('p')({
  margin: '0 0 14px',
  fontSize: 16.5,
  lineHeight: 1.8,
  color: C.ink,
  '&:last-child': { marginBottom: 0 },
  [BP.mobile]: { fontSize: 15.5, lineHeight: 1.72 },
});

/**
 * The portrait column. It is shorter than the story beside it, so on a desktop
 * it sticks while the text scrolls past rather than leaving a long empty gutter.
 */
const PhotoSide = styled('figure')({
  position: 'relative',
  width: 'min(340px, 100%)',
  margin: 0,
  marginInline: 'auto',
  /** Room for the card, which sits under the photo and laps onto its foot. */
  paddingBottom: 132,
  '@media (min-width: 901px)': { position: 'sticky', top: 104 },
  [BP.mobile]: { paddingBottom: 132 },
});

/**
 * The same rectangle as the photo, offset behind it - a matched shape reads as
 * intentional, where the old mismatched panel read as a stray box.
 */
const Frame = styled('span')({
  position: 'absolute',
  insetInlineEnd: -16,
  top: 16,
  width: '100%',
  /** Ends with the photo, not with the column: the card below it is separate. */
  height: 'calc(100% - 132px)',
  borderRadius: RADIUS.cardLarge,
  background: `linear-gradient(150deg, ${C.shell}, ${C.blobPurple})`,
  zIndex: 0,
});

const Portrait = styled('img')({
  position: 'relative',
  zIndex: 1,
  display: 'block',
  width: '100%',
  aspectRatio: '331 / 442',
  objectFit: 'cover',
  borderRadius: RADIUS.cardLarge,
  boxShadow: SHADOW.float,
});

/**
 * Centred under the portrait and lapping onto its foot, so the two shapes read
 * as one object rather than a card dropped on a corner.
 */
const NameCard = styled('figcaption')({
  position: 'absolute',
  insetInline: 0,
  bottom: 0,
  zIndex: 2,
  width: '92%',
  marginInline: 'auto',
  background: C.white,
  borderRadius: RADIUS.card,
  boxShadow: SHADOW.quote,
  padding: '15px 18px 16px',
  textAlign: 'center',
  [BP.mobile]: { width: '94%' },
});

const Name = styled('div')({
  fontSize: 19,
  fontWeight: 900,
  marginBottom: 8,
});

/** Hairline between the name and what he does, the width of the name itself. */
const Rule = styled('span')({
  display: 'block',
  width: 34,
  height: 3,
  borderRadius: 999,
  marginInline: 'auto',
  marginBottom: 10,
  background: C.magenta,
  opacity: 0.35,
});

const Role = styled('div')({
  fontSize: 13.5,
  lineHeight: 1.55,
  color: C.inkSoft,
  /** The title he goes by closes the block, so it carries the weight. */
  '&:last-of-type': { marginTop: 4, fontWeight: 800, color: C.heading },
});

export default function AboutPage() {
  const t = useTranslations(texts);

  return (
    <Root bg={C.paper}>
      <BlobField aria-hidden>
        <SoftBlob
          color={C.blobPurple}
          intensity={0.55}
          softness={40}
          duration={28}
          style={{ insetInlineStart: '-6%', top: '4%', width: '42%', height: '70%' }}
        />
        <SoftBlob
          color={C.blobCream}
          intensity={0.7}
          softness={36}
          duration={34}
          delay={-9}
          style={{ insetInlineStart: '2%', bottom: '-12%', width: '38%', height: '58%' }}
        />
      </BlobField>

      <Container>
        <Split>
          <Reveal>
            <Copy>
              <Title>{t.storyTitle}</Title>
              <Lead>{t.storyLead}</Lead>
              {t.story.map((p) => (
                <Para key={p}>{p}</Para>
              ))}

              <Title>{t.teamTitle}</Title>
              <Lead>{t.teamLead}</Lead>
              {t.team.map((p) => (
                <Para key={p}>{p}</Para>
              ))}
            </Copy>
          </Reveal>

          <Reveal delay={120}>
            <PhotoSide>
              <Frame aria-hidden />
              <Portrait src="/images/marketing/about-eran.png" alt={t.founderPhotoAlt} />
              <NameCard>
                <Name>
                  <GradientText>{t.founderName}</GradientText>
                </Name>
                <Rule aria-hidden />
                {t.founderRoles.map((role) => (
                  <Role key={role}>{role}</Role>
                ))}
              </NameCard>
            </PhotoSide>
          </Reveal>
        </Split>
      </Container>
    </Root>
  );
}
