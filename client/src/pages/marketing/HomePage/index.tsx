import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './HomePage.i18n';
import Hero from '../shared/Hero';
import CustomerLogos from '../shared/CustomerLogos';
import Testimonials from '../shared/Testimonials';
import ContactForm from '../shared/ContactForm';
import Faq from '../shared/Faq';
import SectorPicker from './SectorPicker';
import { C } from '../shared/tokens';
import { CONTACT_ANCHOR } from '../shared/routes';

/**
 * The marketing home page. Deliberately a teaser: after the hero, the sector
 * chooser sends visitors into the three sector pages rather than telling each
 * sector's whole story here - a home page that already gave the full rundown
 * left visitors no reason to click through.
 */
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

      <SectorPicker />

      <CustomerLogos title={t.customersTitle} items={t.customers} bg={C.bandPink} marquee />

      {/* Questions first, the form last - `closing` gives its shadow room above the footer. */}
      <Faq title={t.faqTitle} items={t.faq} />
      <Testimonials items={t.testimonials} wash />
      <ContactForm tone="cream" closing />
    </>
  );
}
