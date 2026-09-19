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
 * The Academy frame lays its content out on a 1216 column (both card rows run
 * 147..1365 of the 1512 frame), narrower than the shared 1356. 1216 + the two 24
 * gutters gives the wrapper width.
 */
const ACADEMY_COLUMN = 1264;

/** Icon sits at the card's inline start - the top right under RTL, as the comps have it. */
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

/** Ringed tick in `currentColor`, so it takes the card's tag colour from `Proof`. */
function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.4 12.3 2.4 2.4 4.8-5" />
    </svg>
  );
}

const TitleRow = styled('div')({ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 });

/** Tinted per card, with dark purple text. */
const AiBadge = styled('span', { shouldForwardProp: (p) => p !== 'bg' })<{ bg?: string }>(({ bg }) => ({
  fontSize: 9.5,
  fontWeight: 800,
  color: '#2E1065',
  background: bg ?? C.shell,
  borderRadius: 5,
  padding: '3px 6px',
  lineHeight: 1,
  flexShrink: 0,
}));

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
        <Container max={ACADEMY_COLUMN}>
          <H2>{t.valueTitle}</H2>
          <SectionIntro>{t.valueIntro}</SectionIntro>
          {/* 2x2 in the comp: cards 147..745 and 767..1365, so 598 wide on a 22 gap. */}
          <CardGrid min={560} gap={22}>
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
        <Container max={ACADEMY_COLUMN}>
          <H2>{t.experienceTitle}</H2>
          <SectionIntro>{t.experienceIntro}</SectionIntro>
          {/* Four across at 286 on a 24 gap - cards 148..434, 458..744, 768..1054, 1078..1364. */}
          <CardGrid min={230} gap={24}>
            {t.experienceCards.map((c, i) => (
              <Reveal key={c.title} delay={i * 80}>
                <Card style={{ background: C.cardTint, boxShadow: 'none', border: `1px solid ${C.cardRule}` }}>
                  <CardHead>
                    <IconTile bg={c.tileBg} size={48} radius={14}>
                      <img src={c.icon} alt="" width={24} height={24} style={{ display: 'block' }} />
                    </IconTile>
                  </CardHead>
                  {/* Badge trails the title: first flex child lands rightmost under RTL,
                      and the comp puts the pill on the title's left. */}
                  <TitleRow>
                    <CardTitle>{c.title}</CardTitle>
                    {'badge' in c && c.badge ? (
                      <AiBadge bg={'badgeBg' in c ? c.badgeBg : undefined}>{c.badge}</AiBadge>
                    ) : null}
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
