import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AboutPage.i18n';
import Reveal from '../shared/Reveal';
import SoftBlob from '../shared/SoftBlob';
import { Band, Container, GradientText } from '../shared/styled';
import { C, SHADOW, RADIUS, BP, TEXT_GRADIENT } from '../shared/tokens';

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

const Copy = styled('div')({ textAlign: 'start', maxWidth: 760 });

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

// ─── Story beats ───

/**
 * The line the company was built around, set as something he said: a large
 * pale quote mark at its head and nothing else, so it lifts off the page
 * without a panel around it.
 */
const Quote = styled('blockquote')({
  position: 'relative',
  margin: '30px 0 32px',
  paddingInlineStart: 52,
  fontSize: 'clamp(16.5px, 1.6vw, 20px)',
  fontWeight: 800,
  lineHeight: 1.5,
  /** The site's text gradient, as on the big headings and his name on the card. */
  background: TEXT_GRADIENT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
  [BP.mobile]: { margin: '24px 0 26px', paddingInlineStart: 38 },
});

/**
 * The same drawing as the Academy testimonial, set large and pale at the head
 * of the line - the mark carries the quote, so the line itself needs no panel.
 */
const QuoteMark = styled('svg')({
  position: 'absolute',
  insetInlineStart: 0,
  top: -6,
  width: 36,
  height: 36,
  fill: C.magenta,
  opacity: 0.3,
  [BP.mobile]: { width: 28, height: 28, top: -2 },
});

/** The sentence the company is born in - given its own beat, not a run-on line. */
const Birth = styled('p')({
  margin: '22px 0',
  fontSize: 'clamp(20px, 2.1vw, 27px)',
  fontWeight: 900,
  lineHeight: 1.3,
  color: C.heading,
});

/**
 * The team's opening line, a notch smaller than the story's lead so the two do
 * not read as the same beat - and so it holds one line at desktop width.
 */
const TeamLead = styled('p')({
  margin: '0 0 18px',
  fontSize: 'clamp(15px, 1.3vw, 17.5px)',
  fontWeight: 800,
  lineHeight: 1.5,
  color: C.heading,
});

const Roles = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 9,
  margin: '4px 0 18px',
});

/** The list of what the team does, as chips instead of a comma run. */
const RolePill = styled('span')({
  fontSize: 13,
  fontWeight: 700,
  color: C.purple,
  background: C.white,
  border: `1px solid ${C.vennEngageEdge}`,
  borderRadius: RADIUS.pill,
  padding: '7px 15px',
});

/** Sets the brand name in the site's text gradient wherever it appears. */
function withBrand(line: string) {
  return line.split('Yooz').flatMap((part, i) =>
    i === 0 ? [part] : [<GradientText key={i}>Yooz</GradientText>, part],
  );
}

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
              <Para>{t.storyOpening}</Para>
              <Quote>
                <QuoteMark viewBox="0 0 24 24" aria-hidden focusable="false">
                  <path d="M4.5 6.5h6v6l-2.6 5H5.1l2.1-5H4.5zM13.5 6.5h6v6l-2.6 5h-2.8l2.1-5h-2.7z" />
                </QuoteMark>
                {t.storyMark}
              </Quote>
              <Para>{t.storySearch}</Para>
              <Birth>{withBrand(t.storyBirth)}</Birth>
              <Para>{t.storyToday}</Para>

              <Title>{t.teamTitle}</Title>
              <TeamLead>{t.teamLead}</TeamLead>
              <Roles>
                {t.teamRoles.map((role) => (
                  <RolePill key={role}>{role}</RolePill>
                ))}
              </Roles>
              <Para>{t.teamBody}</Para>
              <Para>{t.teamClosing}</Para>
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
