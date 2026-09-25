import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AcademyPage.i18n';
import Hero from '../shared/Hero';
import CustomerLogos from '../shared/CustomerLogos';
import FeaturedTestimonial from './FeaturedTestimonial';
import ContactForm from '../shared/ContactForm';
import Faq from '../shared/Faq';
import Reveal from '../shared/Reveal';
import { Band, Container, H2, H3, Body, Card, CardGrid, IconTile, SectionIntro } from '../shared/styled';
import { C, BP } from '../shared/tokens';

const ACADEMY_COLUMN = 1264;

const VALUE_ICONS = [
  { fg: '#5A1B87', bg: '#F3E8FF' },
  { fg: '#DB2777', bg: '#FCE7F3' },
  { fg: '#047857', bg: '#D1FAE5' },
  { fg: '#4F46E5', bg: '#E0E7FF' },
];

const MaskIcon = styled('span', { shouldForwardProp: (p) => p !== 'src' && p !== 'fg' })<{ src: string; fg: string }>(
  ({ src, fg }) => ({
    display: 'block',
    width: 24,
    height: 24,
    backgroundColor: fg,
    WebkitMaskImage: `url("${src}")`,
    maskImage: `url("${src}")`,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
  }),
);

const CardHead = styled('div')({ display: 'flex', justifyContent: 'flex-start', marginBottom: 14 });

const Tag = styled('span')<{ color: string }>(({ color }) => ({
  display: 'block',
  fontSize: 11.5,
  fontWeight: 800,
  letterSpacing: '0.01em',
  color,
  marginBottom: 8,
}));

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

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.4 12.3 2.4 2.4 4.8-5" />
    </svg>
  );
}

const TitleRow = styled('div')({ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 });

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
        mediaUrl="/images/marketing/hero-academy.jpg"
        mediaAlt={t.heroMediaAlt}
      />

      <Band bg={C.paperSoft}>
        <Container max={ACADEMY_COLUMN}>
          <H2 style={{ textWrap: 'balance' }}>{t.valueTitle}</H2>
          <SectionIntro>{t.valueIntro}</SectionIntro>
          <CardGrid min={560} gap={22}>
            {t.valueCards.map((c, i) => (
              <Reveal key={c.title} delay={i * 90}>
                <Card>
                  <CardHead>
                    <IconTile bg={VALUE_ICONS[i % VALUE_ICONS.length].bg}>
                      <MaskIcon src={c.icon} fg={VALUE_ICONS[i % VALUE_ICONS.length].fg} aria-hidden />
                    </IconTile>
                  </CardHead>
                  <Tag color={VALUE_ICONS[i % VALUE_ICONS.length].fg}>{c.tag}</Tag>
                  <H3>{c.title}</H3>
                  <Body>{c.body}</Body>
                  <Proof color={VALUE_ICONS[i % VALUE_ICONS.length].fg}>
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
          <CardGrid min={230} gap={24}>
            {t.experienceCards.map((c, i) => (
              <Reveal key={c.title} delay={i * 80}>
                <Card style={{ background: C.cardTint, boxShadow: 'none', border: `1px solid ${C.cardRule}` }}>
                  <CardHead>
                    <IconTile bg={c.tileBg} size={48} radius={14}>
                      <img src={c.icon} alt="" width={24} height={24} style={{ display: 'block' }} />
                    </IconTile>
                  </CardHead>
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

      <FeaturedTestimonial title={t.testimonialTitle} quote={t.testimonial} />

      <CustomerLogos title={t.customersTitle} items={t.customers} />

      <Faq title={t.faqTitle} items={t.faq} />

      <ContactForm tone="purple" closing />
    </>
  );
}
