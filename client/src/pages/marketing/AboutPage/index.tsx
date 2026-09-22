import { ReactNode } from 'react';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AboutPage.i18n';
import Hero from '../shared/Hero';
import CustomerLogos from '../shared/CustomerLogos';
import ContactForm from '../shared/ContactForm';
import Reveal from '../shared/Reveal';
import { Band, Container, H2, H3, Body, Card, CardGrid, IconTile, SectionIntro } from '../shared/styled';
import { C, BP } from '../shared/tokens';
import { CONTACT_ANCHOR } from '../shared/routes';

/**
 * Drawn inline rather than shipped as files so each takes `currentColor` from
 * its tile - the same drawing serves a lavender, mint or amber section without
 * a second copy. Same approach as the Tourism step markers.
 */
const Glyph = ({ children }: { children: ReactNode }) => (
  <svg
    width="23"
    height="23"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    focusable="false"
  >
    {children}
  </svg>
);

// ─── How it works ───

const IconCode = () => (
  <Glyph>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
    <path d="M14 14.5h2.5M20.5 14.5H19M14 18h1.5M18.5 18h2M17 21h3.5" />
  </Glyph>
);

const IconRoute = () => (
  <Glyph>
    <circle cx="5.5" cy="18.5" r="2.6" />
    <circle cx="18.5" cy="5.5" r="2.6" />
    <path d="M8 18.5h6.2a3.6 3.6 0 0 0 0-7.2H9.4a3.6 3.6 0 0 1 0-7.2h6.6" strokeDasharray="0 0" />
  </Glyph>
);

const IconReport = () => (
  <Glyph>
    <path d="M4 20.5V9M9.6 20.5V4M15.2 20.5v-8M20.8 20.5v-5" />
  </Glyph>
);

// ─── Boosters ───

const IconShare = () => (
  <Glyph>
    <circle cx="18" cy="5.5" r="2.8" />
    <circle cx="6" cy="12" r="2.8" />
    <circle cx="18" cy="18.5" r="2.8" />
    <path d="m8.5 10.6 7-3.6M8.5 13.4l7 3.6" />
  </Glyph>
);

const IconStay = () => (
  <Glyph>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 6.8V12l3.4 2" />
  </Glyph>
);

const IconSpend = () => (
  <Glyph>
    <path d="M20.2 12.6 12.6 20.2a1.8 1.8 0 0 1-2.6 0l-6.2-6.2a1.8 1.8 0 0 1-.5-1.3V5a1.8 1.8 0 0 1 1.8-1.8h7.7c.5 0 .9.2 1.3.5l6.1 6.1a1.9 1.9 0 0 1 0 2.8z" />
    <path d="M7.7 7.7h.01" />
  </Glyph>
);

// ─── Toolbox ───

const IconGames = () => (
  <Glyph>
    <rect x="2.5" y="7" width="19" height="11.5" rx="4.5" />
    <path d="M7 11v3.5M5.3 12.7h3.4M15.6 12.2h.01M18.2 14.4h.01" />
  </Glyph>
);

const IconAi = () => (
  <Glyph>
    <path d="M9.5 3.5 11 8.2l4.7 1.5-4.7 1.5-1.5 4.7L8 11.2 3.3 9.7 8 8.2z" />
    <path d="M17.5 14.2 18.5 17l2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1z" />
  </Glyph>
);

const IconStory = () => (
  <Glyph>
    <path d="M3.5 5.5h7a2.4 2.4 0 0 1 2.4 2.4v12a2.4 2.4 0 0 0-2.4-2.4h-7z" />
    <path d="M20.5 5.5h-6a2.4 2.4 0 0 0-2.4 2.4v12a2.4 2.4 0 0 1 2.4-2.4h6z" />
  </Glyph>
);

const IconData = () => (
  <Glyph>
    <circle cx="12" cy="12" r="8.8" />
    <path d="M12 3.2V12l6.2 6.2" />
  </Glyph>
);

// ─── Audiences ───

const IconTourism = () => (
  <Glyph>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
    <circle cx="12" cy="9.8" r="2.6" />
  </Glyph>
);

const IconBusiness = () => (
  <Glyph>
    <path d="M3.5 9.2 5 4.2h14l1.5 5" />
    <path d="M4.6 9.2v10.6a1.4 1.4 0 0 0 1.4 1.4h12a1.4 1.4 0 0 0 1.4-1.4V9.2" />
    <path d="M3.5 9.2a3 3 0 0 0 5.7 0 3 3 0 0 0 5.6 0 3 3 0 0 0 5.7 0" />
  </Glyph>
);

const IconAcademy = () => (
  <Glyph>
    <path d="M12 3.8 22 8.4l-10 4.6L2 8.4z" />
    <path d="M6.2 10.6v5.2c0 1.8 2.6 3.2 5.8 3.2s5.8-1.4 5.8-3.2v-5.2" />
  </Glyph>
);

const IconOrg = () => (
  <Glyph>
    <path d="M3.5 20.5V6.2L11 3.5v17" />
    <path d="M11 9.8h6.8a1.7 1.7 0 0 1 1.7 1.7v9h-8.5" />
    <path d="M6.6 9h1.3M6.6 13h1.3M6.6 17h1.3M14.4 14h1.3M14.4 17.5h1.3" />
  </Glyph>
);

/** One tile treatment per section, so each row reads as a set. */
const HOW = [
  { Icon: IconCode, bg: '#F3E8FF', fg: '#5A1B87' },
  { Icon: IconRoute, bg: '#DCE3FF', fg: '#3B49A8' },
  { Icon: IconReport, bg: '#D1FAE5', fg: '#047857' },
];

const BOOSTERS = [
  { Icon: IconShare, bg: '#FCE7F3', fg: '#BE1B6B' },
  { Icon: IconStay, bg: '#F3E8FF', fg: '#5A1B87' },
  { Icon: IconSpend, bg: '#FEF0D3', fg: '#9A6410' },
];

const TOOLBOX = [
  { Icon: IconGames, bg: '#F3E8FF', fg: '#5A1B87' },
  { Icon: IconAi, bg: '#FCE7F3', fg: '#BE1B6B' },
  { Icon: IconStory, bg: '#DCE3FF', fg: '#3B49A8' },
  { Icon: IconData, bg: '#D1FAE5', fg: '#047857' },
];

const AUDIENCES = [
  { Icon: IconTourism, bg: '#D1FAE5', fg: '#047857' },
  { Icon: IconBusiness, bg: '#FEF0D3', fg: '#9A6410' },
  { Icon: IconAcademy, bg: '#F3E8FF', fg: '#5A1B87' },
  { Icon: IconOrg, bg: '#DCE3FF', fg: '#3B49A8' },
];

const Head = styled('div')({ display: 'flex', justifyContent: 'flex-start', marginBottom: 14 });

const Stack = styled(Card)({ display: 'flex', flexDirection: 'column', gap: 6 });

/** The named engagements under each audience, set apart from its description. */
const WorkNote = styled('p')({
  marginTop: 'auto',
  paddingTop: 12,
  marginBottom: 0,
  borderTop: `1px solid ${C.ruleSoft}`,
  fontSize: 13.5,
  lineHeight: 1.65,
  color: C.ink,
  fontWeight: 600,
  [BP.mobile]: { fontSize: 14 },
});

const Label = styled('span')({
  fontSize: 11.5,
  fontWeight: 800,
  letterSpacing: '0.02em',
  color: C.purple,
  marginBottom: 2,
});

export default function AboutPage() {
  const t = useTranslations(texts);

  return (
    <>
      <Hero
        titleTop={t.heroTitleTop}
        titleBottom={t.heroTitleBottom}
        lead={t.heroLead}
        primaryCta={t.heroCta}
        primaryHref={CONTACT_ANCHOR}
        mediaUrl="/images/marketing/about-hero.svg"
        mediaAlt={t.heroMediaAlt}
        blobs
      />

      <Band bg={C.paper}>
        <Container>
          <H2>{t.howTitle}</H2>
          <SectionIntro>{t.howIntro}</SectionIntro>
          <CardGrid min={280}>
            {t.how.map((s, i) => {
              const { Icon, bg, fg } = HOW[i] ?? HOW[0];
              return (
                <Reveal key={s.title} delay={i * 80}>
                  <Stack>
                    <Head>
                      <IconTile bg={bg} fg={fg} size={48} radius={14}>
                        <Icon />
                      </IconTile>
                    </Head>
                    <H3>{s.title}</H3>
                    <Body>{s.body}</Body>
                  </Stack>
                </Reveal>
              );
            })}
          </CardGrid>
        </Container>
      </Band>

      <Band bg={C.paperSoft}>
        <Container>
          <H2>{t.boostersTitle}</H2>
          <SectionIntro>{t.boostersIntro}</SectionIntro>
          <CardGrid min={280}>
            {t.boosters.map((b, i) => {
              const { Icon, bg, fg } = BOOSTERS[i] ?? BOOSTERS[0];
              return (
                <Reveal key={b.label} delay={i * 80}>
                  <Stack>
                    <Head>
                      <IconTile bg={bg} fg={fg} size={48} radius={14}>
                        <Icon />
                      </IconTile>
                    </Head>
                    <Label>{b.label}</Label>
                    <H3>{b.title}</H3>
                    <Body>{b.body}</Body>
                  </Stack>
                </Reveal>
              );
            })}
          </CardGrid>
        </Container>
      </Band>

      <Band bg={C.paper}>
        <Container>
          <H2>{t.toolboxTitle}</H2>
          <SectionIntro>{t.toolboxIntro}</SectionIntro>
          <CardGrid min={300}>
            {t.toolbox.map((b, i) => {
              const { Icon, bg, fg } = TOOLBOX[i] ?? TOOLBOX[0];
              return (
                <Reveal key={b.title} delay={i * 70}>
                  <Stack>
                    <Head>
                      <IconTile bg={bg} fg={fg} size={48} radius={14}>
                        <Icon />
                      </IconTile>
                    </Head>
                    <H3>{b.title}</H3>
                    <Body>{b.body}</Body>
                  </Stack>
                </Reveal>
              );
            })}
          </CardGrid>
        </Container>
      </Band>

      <Band bg={C.paperSoft}>
        <Container>
          <H2>{t.audiencesTitle}</H2>
          <SectionIntro>{t.audiencesIntro}</SectionIntro>
          <CardGrid min={280}>
            {t.audiences.map((a, i) => {
              const { Icon, bg, fg } = AUDIENCES[i] ?? AUDIENCES[0];
              return (
                <Reveal key={a.title} delay={i * 70}>
                  <Stack>
                    <Head>
                      <IconTile bg={bg} fg={fg} size={48} radius={14}>
                        <Icon />
                      </IconTile>
                    </Head>
                    <H3>{a.title}</H3>
                    <Body>{a.body}</Body>
                    <WorkNote>{a.work}</WorkNote>
                  </Stack>
                </Reveal>
              );
            })}
          </CardGrid>
        </Container>
      </Band>

      <CustomerLogos title={t.customersTitle} items={t.customers} bg={C.bandPink} marquee />

      <ContactForm tone="purple" roomBelow />
    </>
  );
}
