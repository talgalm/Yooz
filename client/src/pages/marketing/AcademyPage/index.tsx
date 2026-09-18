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

/**
 * Icon sits at the inline-START of the card in the comps, above the copy - which
 * under RTL is the top RIGHT corner, the same side the copy is aligned to.
 * `flex-end` is physical, so it put the tile on the left, opposite the comp.
 */
const CardHead = styled('div')({ display: 'flex', justifyContent: 'flex-start', marginBottom: 14 });

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
  '& svg': { flexShrink: 0 },
}));

/**
 * The comp closes each proof line with a ringed tick, not a bare glyph. Stroked
 * in `currentColor` so it takes the card's tag colour from `Proof`.
 */
function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.4 12.3 2.4 2.4 4.8-5" />
    </svg>
  );
}

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
          {/* 2x2 in the comp. 360 auto-fit three across the 1308 content column,
              leaving a fourth card stranded on its own row; 560 forces two-up. */}
          <CardGrid min={560}>
            {t.valueCards.map((c, i) => (
              <Reveal key={c.title} delay={i * 90}>
                <Card>
                  <CardHead>
                    <IconTile bg={c.tileBg}>
                      <img src={c.icon} alt="" width={24} height={24} style={{ display: 'block' }} />
                    </IconTile>
                  </CardHead>
                  <Tag color={c.tagColor}>{c.tag}</Tag>
                  <H3>{c.title}</H3>
                  <Body>{c.body}</Body>
                  <Proof color={c.tagColor}>
                    <CheckIcon />
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
