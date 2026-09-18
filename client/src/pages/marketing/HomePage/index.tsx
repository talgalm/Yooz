import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './HomePage.i18n';
import Venn from './Venn';
import Hero from '../shared/Hero';
import FeatureSplit from '../shared/FeatureSplit';
import CustomerLogos from '../shared/CustomerLogos';
import Testimonials from '../shared/Testimonials';
import ContactForm from '../shared/ContactForm';
import Faq from '../shared/Faq';
import Reveal from '../shared/Reveal';
import { Band, Container, H2 } from '../shared/styled';
import { C, SECTORS_GRADIENT, SECTORS_GRADIENT_END } from '../shared/tokens';
import { CONTACT_ANCHOR } from '../shared/routes';

export default function HomePage() {
  const t = useTranslations(texts);

  return (
    <>
      <Hero
        titleTop={t.heroTitleTop}
        titleBottom={t.heroTitleBottom}
        lead={t.heroLead}
        primaryCta={t.heroCta}
        primaryHref={CONTACT_ANCHOR}
        mediaUrl="/images/marketing/hero-home.png"
        mediaAlt={t.heroMediaAlt}
        blobs
      />

      <Band bg={C.paper} style={{ paddingBottom: 40 }}>
        <Container>
          <H2>{t.whyTitle}</H2>
          <Reveal>
            <Venn
              items={[
                { label: t.engage, text: t.engageText },
                { label: t.grow, text: t.growText },
                { label: t.share, text: t.shareText },
              ]}
            />
          </Reveal>
        </Container>
      </Band>

      {/*
        The sectors heading rides a vertical gradient (#FFF8FF -> #FFE7FF), not a
        flat fill, and needs no shape above it - it grows out of the white
        section continuously.
      */}
      <Band style={{ background: SECTORS_GRADIENT, paddingBlock: '96px 104px' }}>
        <Container>
          <H2 style={{ margin: 0 }}>{t.sectorsTitle}</H2>
        </Container>
      </Band>

      {/* Alternating sector stack - each block links through to its own page. */}
      <FeatureSplit
        title={t.businessTitle}
        items={t.businessItems}
        linkLabel={t.more}
        linkTo="/business"
        mediaUrl="/images/marketing/sector-business.jpg"
        mediaAlt={t.businessMediaAlt}
        mediaRatio={1.62}
        bg={C.bandPeach}
        discBg={C.discPink}
        shape="peach"
        shapeFrom={SECTORS_GRADIENT_END}
      />
      <FeatureSplit
        title={t.academyTitle}
        items={t.academyItems}
        linkLabel={t.more}
        linkTo="/academy"
        mediaUrl="/images/marketing/sector-academy.jpg"
        mediaAlt={t.academyMediaAlt}
        mediaRatio={1.24}
        bg={C.bandLavender}
        discBg={C.vennEngage}
        reverse
        shape="lavender"
        shapeFrom={C.bandPeach}
      />
      <FeatureSplit
        title={t.tourismTitle}
        items={t.tourismItems}
        linkLabel={t.more}
        linkTo="/tourism"
        mediaUrl="/images/marketing/sector-tourism.jpg"
        mediaAlt={t.tourismMediaAlt}
        mediaRatio={1.47}
        bg={C.bandMint}
        discBg={C.discMint}
        shape="mint"
        shapeFrom={C.bandLavender}
      />

      <CustomerLogos title={t.customersTitle} items={t.customers} bg={C.bandPink} marquee />

      <ContactForm tone="cream" />
      <Testimonials items={t.testimonials} />
      <Faq title={t.faqTitle} items={t.faq} />
    </>
  );
}
