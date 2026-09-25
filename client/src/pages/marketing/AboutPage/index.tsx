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

const BlobField = styled('div')({
  position: 'absolute',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
});

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

const PhotoSide = styled('figure')({
  position: 'relative',
  width: 'min(340px, 100%)',
  margin: 0,
  marginInline: 'auto',
  paddingBottom: 132,
  '@media (min-width: 901px)': { position: 'sticky', top: 104 },
  [BP.mobile]: { paddingBottom: 132 },
});

const Frame = styled('span')({
  position: 'absolute',
  insetInlineEnd: -16,
  top: 16,
  width: '100%',
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
  '&:last-of-type': { marginTop: 4, fontWeight: 800, color: C.heading },
});

const Quote = styled('blockquote')({
  position: 'relative',
  margin: '30px 0 32px',
  paddingInlineStart: 52,
  fontSize: 'clamp(16.5px, 1.6vw, 20px)',
  fontWeight: 800,
  lineHeight: 1.5,
  background: TEXT_GRADIENT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
  [BP.mobile]: { margin: '24px 0 26px', paddingInlineStart: 38 },
});

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

const Birth = styled('p')({
  margin: '22px 0',
  fontSize: 'clamp(20px, 2.1vw, 27px)',
  fontWeight: 900,
  lineHeight: 1.3,
  color: C.heading,
});

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

const RolePill = styled('span')({
  fontSize: 13,
  fontWeight: 700,
  color: C.purple,
  background: C.white,
  border: `1px solid ${C.vennEngageEdge}`,
  borderRadius: RADIUS.pill,
  padding: '7px 15px',
});

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
