import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './TourismPage.i18n';
import Hero from '../shared/Hero';
import StatStrip from '../shared/StatStrip';
import IconCardRow from '../shared/IconCardRow';
import MarketingEngine from '../shared/MarketingEngine';
import CustomerLogos from '../shared/CustomerLogos';
import Testimonials from '../shared/Testimonials';
import ContactForm from '../shared/ContactForm';
import Faq from '../shared/Faq';
import Reveal from '../shared/Reveal';
import { Band, Container, H2, H3, Body, SectionIntro } from '../shared/styled';
import { C, SHADOW, RADIUS, BP } from '../shared/tokens';
import { CONTACT_ANCHOR } from '../shared/routes';

/** The single-line takeaway between the two card rows. */
const BottomLine = styled('p')({
  maxWidth: 940,
  marginInline: 'auto',
  marginTop: 40,
  marginBottom: 0,
  background: C.white,
  border: `1.5px solid ${C.vennShareEdge}`,
  borderRadius: RADIUS.pill,
  padding: '20px 32px',
  textAlign: 'center',
  fontSize: 15.5,
  lineHeight: 1.7,
  color: C.heading,
  [BP.mobile]: { fontSize: 14, padding: '16px 18px', borderRadius: 20 },
});

const BottomLabel = styled('span')({ fontWeight: 800, display: 'block' });

// ─── Case study ───

const CaseHead = styled('div')({ textAlign: 'center' });

const CaseTag = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  fontSize: 12,
  fontWeight: 800,
  color: C.purple,
  background: C.white,
  border: `1px solid ${C.vennEngageEdge}`,
  borderRadius: RADIUS.pill,
  padding: '7px 16px',
  marginBottom: 16,
});

const CaseSubtitle = styled('div')({
  fontSize: 'clamp(19px, 2.2vw, 26px)',
  fontWeight: 900,
  color: C.heading,
  marginBottom: 10,
});

const Steps = styled('div')({
  display: 'inline-flex',
  background: C.white,
  borderRadius: RADIUS.button,
  boxShadow: SHADOW.card,
  padding: 6,
  gap: 6,
  marginBottom: 30,
  flexWrap: 'wrap',
  justifyContent: 'center',
});

const Step = styled('span')<{ active?: boolean }>(({ active }) => ({
  fontSize: 13,
  fontWeight: 700,
  padding: '10px 18px',
  borderRadius: 8,
  whiteSpace: 'nowrap',
  background: active ? C.purple : 'transparent',
  color: active ? C.white : C.inkSoft,
  [BP.mobile]: { fontSize: 11.5, padding: '8px 12px' },
}));

const CaseCard = styled('div')({
  background: C.white,
  borderRadius: RADIUS.cardLarge,
  boxShadow: SHADOW.cardHover,
  overflow: 'hidden',
  display: 'grid',
  gridTemplateColumns: '1fr',
  '@media (min-width: 901px)': { gridTemplateColumns: '1fr 1fr' },
});

const CaseCopy = styled('div')({ padding: '34px 32px', [BP.mobile]: { padding: '24px 20px' } });

const StepLabel = styled('span')({
  display: 'inline-block',
  fontSize: 11.5,
  fontWeight: 800,
  color: C.purple,
  background: C.shell,
  borderRadius: 7,
  padding: '5px 12px',
  marginBottom: 14,
});

const Checks = styled('ul')({ listStyle: 'none', margin: '18px 0 0', padding: 0, display: 'grid', gap: 10 });

const Check = styled('li')({
  display: 'flex',
  gap: 9,
  alignItems: 'flex-start',
  fontSize: 13,
  fontWeight: 700,
  color: C.heading,
  '&::before': { content: '"✓"', color: '#1E8A53', fontWeight: 900, flexShrink: 0 },
});

const CaseMedia = styled('div')({
  background: C.heading,
  minHeight: 280,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255,255,255,0.72)',
  fontSize: 13,
  fontWeight: 600,
  textAlign: 'center',
  padding: 24,
});

export default function TourismPage() {
  const t = useTranslations(texts);

  return (
    <>
      <Hero
        titleTop={t.heroTitleTop}
        titleBottom={t.heroTitleBottom}
        titleThird={t.heroTitleThird}
        lead={t.heroLead}
        primaryCta={t.heroCta}
        primaryHref={CONTACT_ANCHOR}
        secondaryCta={t.heroSecondary}
        secondaryHref={CONTACT_ANCHOR}
        mediaUrl="/images/marketing/hero-tourism.jpg"
        mediaAlt={t.heroMediaAlt}
        pinkFrame
      >
        <StatStrip items={t.stats} />
      </Hero>

      <Band bg={C.paper} style={{ paddingBottom: 40 }}>
        <Container>
          <H2>{t.knowledgeTitle}</H2>
        </Container>
        <IconCardRow items={t.knowledgeCards.map((c) => ({ ...c, iconBg: C.vennShare }))} min={200} />
        <Container>
          <BottomLine>
            <BottomLabel>{t.bottomLineLabel}</BottomLabel>
            {t.bottomLine}
          </BottomLine>
        </Container>
      </Band>

      <Band bg={C.paperSoft} style={{ paddingBottom: 40 }}>
        <Container>
          <H2>{t.fitTitle}</H2>
          <SectionIntro>{t.fitIntro}</SectionIntro>
        </Container>
        <IconCardRow items={t.fitCards.map((c) => ({ ...c, iconBg: C.blobPurple }))} min={230} />
      </Band>

      <Band bg={C.paper}>
        <Container>
          <CaseHead>
            <CaseTag>
              <span aria-hidden>▶</span>
              {t.caseTag}
            </CaseTag>
            <H2 style={{ marginBottom: 6 }}>{t.caseTitle}</H2>
            <CaseSubtitle>{t.caseSubtitle}</CaseSubtitle>
            <SectionIntro style={{ marginBottom: 26 }}>{t.caseIntro}</SectionIntro>
            <Steps>
              {t.caseSteps.map((s, i) => (
                <Step key={s} active={i === 0}>{s}</Step>
              ))}
            </Steps>
          </CaseHead>

          <Reveal>
            <CaseCard>
              <CaseCopy>
                <StepLabel>{t.caseStepLabel}</StepLabel>
                <H3 style={{ fontSize: 21 }}>{t.caseCardTitle}</H3>
                <Body>{t.caseCardBody}</Body>
                <Checks>
                  {t.caseChecks.map((c) => (
                    <Check key={c}>{c}</Check>
                  ))}
                </Checks>
              </CaseCopy>
              {/* The case-study clip was not among the supplied assets. */}
              <CaseMedia>{t.caseMediaAlt}</CaseMedia>
            </CaseCard>
          </Reveal>
        </Container>
      </Band>

      <MarketingEngine videoUrl="/images/marketing/engine-park.mp4" />

      <CustomerLogos title={t.customersTitle} items={t.customers} bg={C.bandPink} />

      <ContactForm tone="purple" />
      <Testimonials items={t.testimonials} />
      <Faq title={t.faqTitle} items={t.faq} />
    </>
  );
}
