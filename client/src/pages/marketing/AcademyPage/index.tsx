import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AcademyPage.i18n';
import Hero from '../shared/Hero';
import CustomerLogos from '../shared/CustomerLogos';
import Testimonials from '../shared/Testimonials';
import ContactForm from '../shared/ContactForm';
import Faq from '../shared/Faq';
import Reveal from '../shared/Reveal';
import { Band, Container, H2, H3, Body, Card, CardGrid, IconTile, SectionIntro } from '../shared/styled';
import { C, BP } from '../shared/tokens';
import { CONTACT_ANCHOR } from '../shared/routes';

/** Icon sits at the inline-end of the card in the comps, above the copy. */
const CardHead = styled('div')({ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 });

const Tag = styled('span')<{ color: string }>(({ color }) => ({
  display: 'block',
  fontSize: 11.5,
  fontWeight: 800,
  letterSpacing: '0.01em',
  color,
  marginBottom: 8,
}));

/** The coloured "proof" line closing each value card. */
const Proof = styled('div')<{ color: string }>(({ color }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  marginTop: 16,
  fontSize: 12.5,
  fontWeight: 700,
  color,
}));

const TitleRow = styled('div')({ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 });

const AiBadge = styled('span')({
  fontSize: 9.5,
  fontWeight: 800,
  color: C.white,
  background: C.purple,
  borderRadius: 5,
  padding: '3px 6px',
  lineHeight: 1,
  flexShrink: 0,
});

const CardTitle = styled('h3')({
  fontSize: 17,
  fontWeight: 800,
  color: C.heading,
  margin: 0,
  [BP.mobile]: { fontSize: 15.5 },
});

export default function AcademyPage() {
  const t = useTranslations(texts);

  return (
    <>
      <Hero
        tone="photo"
        titleTop={t.heroTitleTop}
        titleBottom={t.heroTitleBottom}
        lead={t.heroLead}
        primaryCta={t.heroCta}
        primaryHref={CONTACT_ANCHOR}
        mediaUrl="/images/marketing/hero-academy.jpg"
        mediaAlt={t.heroMediaAlt}
      />

      <Band bg={C.paperSoft}>
        <Container>
          <H2>{t.valueTitle}</H2>
          <SectionIntro>{t.valueIntro}</SectionIntro>
          {/* Two-up on desktop, matching the comp's 2x2 block. */}
          <CardGrid min={360}>
            {t.valueCards.map((c, i) => (
              <Reveal key={c.title} delay={i * 90}>
                <Card>
                  <CardHead>
                    <IconTile bg={c.tileBg}>{c.icon}</IconTile>
                  </CardHead>
                  <Tag color={c.tagColor}>{c.tag}</Tag>
                  <H3>{c.title}</H3>
                  <Body>{c.body}</Body>
                  <Proof color={c.tagColor}>
                    <span aria-hidden>✓</span>
                    {c.proof}
                  </Proof>
                </Card>
              </Reveal>
            ))}
          </CardGrid>
        </Container>
      </Band>

      <Band bg={C.paper}>
        <Container>
          <H2>{t.experienceTitle}</H2>
          <SectionIntro>{t.experienceIntro}</SectionIntro>
          <CardGrid min={230}>
            {t.experienceCards.map((c, i) => (
              <Reveal key={c.title} delay={i * 80}>
                <Card style={{ background: C.paperSoft, boxShadow: 'none' }}>
                  <CardHead>
                    <IconTile bg={c.tileBg} fg={c.fg}>{c.icon}</IconTile>
                  </CardHead>
                  <TitleRow>
                    {'badge' in c && c.badge ? <AiBadge>{c.badge}</AiBadge> : null}
                    <CardTitle>{c.title}</CardTitle>
                  </TitleRow>
                  <Body>{c.body}</Body>
                </Card>
              </Reveal>
            ))}
          </CardGrid>
        </Container>
      </Band>

      <Testimonials items={t.testimonials} />

      <CustomerLogos title={t.customersTitle} items={t.customers} />

      <ContactForm tone="peach" />

      <Faq title={t.faqTitle} items={t.faq} />
    </>
  );
}
