import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './BusinessPage.i18n';
import Hero from '../shared/Hero';
import MarketingEngine from '../shared/MarketingEngine';
import IconCardRow from '../shared/IconCardRow';
import CustomerLogos from '../shared/CustomerLogos';
import Testimonials from '../shared/Testimonials';
import ContactForm from '../shared/ContactForm';
import Faq from '../shared/Faq';
import Reveal from '../shared/Reveal';
import { Band, Container, H2, H3, Body, Card, CardGrid, IconDisc, SectionIntro } from '../shared/styled';
import { C } from '../shared/tokens';
import { CONTACT_ANCHOR } from '../shared/routes';

export default function BusinessPage() {
  const t = useTranslations(texts);

  return (
    <>
      <Hero
        titleTop={t.heroTitleTop}
        titleBottom={t.heroTitleBottom}
        bullets={t.heroBullets}
        primaryCta={t.heroCta}
        primaryHref={CONTACT_ANCHOR}
        secondaryCta={t.heroSecondary}
        secondaryHref={CONTACT_ANCHOR}
        mediaUrl="/images/marketing/hero-business.png"
        mediaAlt={t.heroMediaAlt}
      />

      <Band bg={C.paperSoft}>
        <Container>
          <H2>{t.salesTitle}</H2>
          <SectionIntro>{t.salesIntro}</SectionIntro>
          <CardGrid min={200}>
            {t.salesCards.map((c, i) => (
              <Reveal key={c.title} delay={i * 80}>
                <Card style={{ textAlign: 'center' }}>
                  {/* 30px is the icons' own size in the frame. */}
                  <IconDisc bg={C.vennEngage} imgSize={30}>
                    <img src={c.icon} alt="" loading="lazy" />
                  </IconDisc>
                  <H3>{c.title}</H3>
                  <Body>{c.desc}</Body>
                </Card>
              </Reveal>
            ))}
          </CardGrid>
        </Container>
      </Band>

      <Band bg={C.paper} style={{ paddingBottom: 40 }}>
        <Container>
          <H2>{t.audienceTitle}</H2>
        </Container>
        <IconCardRow items={t.audienceCards} min={240} align="start" iconVariant="inline" />
      </Band>

      <MarketingEngine
        videoUrl="/images/marketing/engine-park.mp4"
      />

      <CustomerLogos title={t.customersTitle} items={t.customers} bg={C.bandPink} />

      <ContactForm tone="purple" />
      <Testimonials items={t.testimonials} />
      <Faq title={t.faqTitle} items={t.faq} bg="#FDFAEF" />
    </>
  );
}
