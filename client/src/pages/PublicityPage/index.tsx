import { useEffect, useState, FormEvent } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import { useLang, useTranslations } from '../../context/LanguageContext';
import { apiFetch } from '../../utils/api';
import LangDrawer from '../../components/LangDrawer';
import { texts } from './PublicityPage.i18n';
import type { SiteContent, LocalizedText } from '../../types/publicity';

const PURPLE = '#390363';
const PURPLE_LIGHT = '#6c2fb0';
const TEAL = '#2ec4b6';
const ORANGE = '#ff8a3d';
const BLUE = '#2f9bd6';

const fadeUp = keyframes`from { opacity:0; transform:translateY(20px);} to {opacity:1; transform:translateY(0);}`;

function GeoDecor({ flip = false }: { flip?: boolean }) {
  return (
    <DecorSvg viewBox="0 0 400 400" style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden>
      <polygon points="40,20 120,10 90,90" fill={TEAL} opacity="0.9" />
      <polygon points="120,10 190,40 120,90 90,90" fill={ORANGE} opacity="0.85" />
      <polygon points="20,120 90,90 110,170 30,190" fill={PURPLE_LIGHT} opacity="0.8" />
      <polygon points="150,120 220,110 200,200 140,180" fill={BLUE} opacity="0.75" />
      <rect x="60" y="220" width="70" height="70" rx="10" fill={TEAL} opacity="0.6" transform="rotate(18 95 255)" />
      <polygon points="230,220 300,210 280,300 210,290" fill={ORANGE} opacity="0.7" />
      <circle cx="300" cy="120" r="34" fill={PURPLE_LIGHT} opacity="0.55" />
    </DecorSvg>
  );
}

function InfinityGraphic() {
  return (
    <InfinitySvg viewBox="0 0 600 240" aria-hidden>
      <path
        d="M300,120 C300,40 200,40 150,90 C90,150 90,150 150,150 C200,200 300,200 300,120 C300,40 400,40 450,90 C510,150 510,150 450,150 C400,200 300,200 300,120 Z"
        fill="none"
        stroke="url(#grad)"
        strokeWidth="34"
        strokeLinecap="round"
        opacity="0.25"
      />
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={TEAL} />
          <stop offset="50%" stopColor={PURPLE_LIGHT} />
          <stop offset="100%" stopColor={ORANGE} />
        </linearGradient>
      </defs>
    </InfinitySvg>
  );
}

const Page = styled('div')({ background: '#fff', color: PURPLE, minHeight: '100dvh' });

const Nav = styled('nav')({
  position: 'sticky',
  top: 0,
  zIndex: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '12px 24px',
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(8px)',
  boxShadow: '0 2px 12px rgba(57,3,99,0.08)',
});
const NavLinks = styled('div')({
  display: 'none',
  gap: 22,
  alignItems: 'center',
  '@media (min-width: 820px)': { display: 'flex' },
});
const NavLink = styled('a')({
  color: PURPLE,
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 15,
  cursor: 'pointer',
  '&:hover': { color: PURPLE_LIGHT },
});
const NavRight = styled('div')({ display: 'flex', alignItems: 'center', gap: 10 });
const NavLogo = styled('img')({ height: 34 });

const CtaButton = styled('a')({
  background: `linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_LIGHT} 100%)`,
  color: '#fff',
  textDecoration: 'none',
  borderRadius: 50,
  padding: '10px 22px',
  fontWeight: 800,
  fontSize: 14,
  boxShadow: '0 4px 14px rgba(57,3,99,0.3)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'transform 0.15s',
  '&:hover': { transform: 'translateY(-1px)' },
});

const Section = styled('section')({
  position: 'relative',
  padding: '72px 24px',
  maxWidth: 1120,
  margin: '0 auto',
  '@media (max-width: 700px)': { padding: '48px 20px' },
});
const SectionTitle = styled('h2')({
  fontSize: 34,
  fontWeight: 900,
  textAlign: 'center',
  margin: '0 0 12px',
  '@media (max-width: 700px)': { fontSize: 26 },
});
const SectionIntro = styled('p')({
  fontSize: 17,
  lineHeight: 1.7,
  textAlign: 'center',
  color: '#5a4a72',
  maxWidth: 760,
  margin: '0 auto 40px',
});

const Hero = styled('div')({
  position: 'relative',
  overflow: 'hidden',
  background: 'linear-gradient(160deg, #f6f0ff 0%, #ffffff 60%)',
  padding: '64px 24px 80px',
});
const HeroInner = styled('div')({
  maxWidth: 1120,
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 32,
  alignItems: 'center',
  position: 'relative',
  zIndex: 2,
  '@media (min-width: 900px)': { gridTemplateColumns: '1.1fr 0.9fr' },
});
const HeroBadge = styled('span')({
  display: 'inline-block',
  background: TEAL,
  color: '#fff',
  fontWeight: 800,
  fontSize: 13,
  borderRadius: 50,
  padding: '5px 16px',
  marginBottom: 16,
});
const HeroTitle = styled('h1')({
  fontSize: 46,
  fontWeight: 900,
  lineHeight: 1.15,
  margin: '0 0 16px',
  '@media (max-width: 700px)': { fontSize: 32 },
});
const HeroSubtitle = styled('p')({ fontSize: 20, lineHeight: 1.6, color: '#5a4a72', margin: '0 0 28px' });
const PhoneFrame = styled('div')({
  width: 240,
  height: 480,
  margin: '0 auto',
  borderRadius: 36,
  background: '#111',
  border: '10px solid #111',
  overflow: 'hidden',
  boxShadow: '0 20px 60px rgba(57,3,99,0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: `${fadeUp} 0.6s ease-out`,
});
const PhoneImg = styled('img')({ width: '100%', height: '100%', objectFit: 'cover' });
const PhonePlaceholder = styled('div')({
  color: 'rgba(255,255,255,0.5)',
  fontWeight: 700,
  fontSize: 18,
  letterSpacing: 2,
});
const DecorSvg = styled('svg')({
  position: 'absolute',
  width: 300,
  height: 300,
  top: -20,
  insetInlineEnd: -40,
  zIndex: 1,
  pointerEvents: 'none',
  '@media (max-width: 700px)': { width: 180, height: 180, opacity: 0.55 },
});

const Grid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 24,
});
const Card = styled('div')({
  background: '#fff',
  borderRadius: 22,
  overflow: 'hidden',
  boxShadow: '0 6px 24px rgba(57,3,99,0.1)',
  border: '1px solid #f0eaf9',
  display: 'flex',
  flexDirection: 'column',
});
const CardImg = styled('div')<{ src?: string }>(({ src }) => ({
  height: 150,
  background: src ? `url(${src}) center/cover` : `linear-gradient(135deg, ${PURPLE_LIGHT}, ${TEAL})`,
}));
const CardBody = styled('div')({ padding: '20px 22px' });
const CardTitle = styled('h3')({ fontSize: 20, fontWeight: 800, margin: '0 0 8px' });
const CardDesc = styled('p')({ fontSize: 15, lineHeight: 1.6, color: '#5a4a72', margin: 0 });
const ProjectList = styled('ul')({ margin: '14px 0 0', paddingInlineStart: 18, color: '#5a4a72', fontSize: 14, lineHeight: 1.7 });
const ProjectLink = styled('a')({ color: PURPLE_LIGHT, fontWeight: 700, textDecoration: 'none' });

const EngineWrap = styled('div')({ position: 'relative' });
const InfinitySvg = styled('svg')({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  zIndex: 0,
  pointerEvents: 'none',
});
const Boosters = styled('div')({
  position: 'relative',
  zIndex: 1,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 24,
});
const Booster = styled('div')({
  background: '#fff',
  borderRadius: 20,
  padding: '24px 22px',
  boxShadow: '0 6px 24px rgba(57,3,99,0.12)',
  textAlign: 'center',
});
const BoosterIcon = styled('div')<{ bg: string }>(({ bg }) => ({
  width: 56,
  height: 56,
  borderRadius: '50%',
  background: bg,
  margin: '0 auto 14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}));
const BoosterIconImg = styled('img')({ width: '100%', height: '100%', objectFit: 'cover' });
const BoosterTitle = styled('h3')({ fontSize: 20, fontWeight: 900, margin: '0 0 4px' });
const BoosterSub = styled('div')({ fontSize: 15, fontWeight: 700, color: PURPLE_LIGHT, marginBottom: 10 });
const BoosterDesc = styled('p')({ fontSize: 14, lineHeight: 1.6, color: '#5a4a72', margin: 0 });

const LogoRow = styled('div')({ display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'center', alignItems: 'center' });
const LogoImg = styled('img')({ height: 56, objectFit: 'contain', filter: 'grayscale(0.2)' });

const ContactSection = styled('section')({ background: PURPLE, color: '#fff', padding: '72px 24px' });
const ContactInner = styled('div')({ maxWidth: 900, margin: '0 auto' });
const ContactTitle = styled('h2')({ fontSize: 40, fontWeight: 900, textAlign: 'center', margin: '0 0 8px' });
const ContactMeta = styled('div')({ textAlign: 'center', color: 'rgba(255,255,255,0.85)', marginBottom: 36, fontSize: 15 });
const Form = styled('form')({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 });
const Field = styled('input')({
  background: 'transparent',
  border: 'none',
  borderBottom: '1.5px solid rgba(255,255,255,0.5)',
  color: '#fff',
  fontSize: 16,
  padding: '10px 4px',
  outline: 'none',
  fontFamily: 'inherit',
  '&::placeholder': { color: 'rgba(255,255,255,0.7)' },
  '&:focus': { borderBottomColor: TEAL },
});
const FieldWide = styled(Field)({ gridColumn: '1 / -1' });
const SubmitRow = styled('div')({ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 8 });
const SendBtn = styled('button')({
  background: TEAL,
  color: '#fff',
  border: 'none',
  borderRadius: 50,
  padding: '12px 44px',
  fontSize: 16,
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:disabled': { opacity: 0.6, cursor: 'default' },
});
const FormNote = styled('div')<{ error?: boolean }>(({ error }) => ({
  fontSize: 14,
  fontWeight: 700,
  color: error ? '#ffcaca' : TEAL,
}));

const BOOSTER_COLORS: Record<string, string> = { share: ORANGE, stay: BLUE, spend: TEAL };

export default function PublicityPage() {
  const { lang, dir } = useLang();
  const t = useTranslations(texts);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [form, setForm] = useState({ name: '', company: '', position: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error' | 'required'>('idle');

  const L = (f?: LocalizedText) => (f ? f[lang] || f.he || f.en : '');

  useEffect(() => {
    apiFetch<{ content: SiteContent }>('/api/site-content')
      .then((r) => setContent(r.content))
      .catch(() => setStatus('error'));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) { setStatus('required'); return; }
    setStatus('sending');
    try {
      await apiFetch('/api/site-content/leads', { method: 'POST', body: JSON.stringify(form) });
      setStatus('ok');
      setForm({ name: '', company: '', position: '', email: '', phone: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  if (!content) return <Page dir={dir} style={{ padding: 40, textAlign: 'center' }}>…</Page>;

  const { hero, audiences, engine, customers, contact } = content;

  return (
    <Page dir={dir}>
      <Nav>
        <NavRight>
          <LangDrawer />
          <CtaButton href="#contact">{t.bookDemo}</CtaButton>
        </NavRight>
        <NavLinks>
          <NavLink href="#audiences">{t.navAudiences}</NavLink>
          <NavLink href="#engine">{t.navEngine}</NavLink>
          <NavLink href="#customers">{t.navCustomers}</NavLink>
          <NavLink href="#contact">{t.navContact}</NavLink>
        </NavLinks>
        <NavLogo src={content.brandLogoUrl || '/images/logo-purple.png'} alt="Yooz" />
      </Nav>

      <Hero>
        <GeoDecor />
        <HeroInner>
          <div>
            {L(hero.badge) && <HeroBadge>{L(hero.badge)}</HeroBadge>}
            <HeroTitle>{L(hero.title)}</HeroTitle>
            <HeroSubtitle>{L(hero.subtitle)}</HeroSubtitle>
            <CtaButton href={hero.ctaUrl || '#contact'}>{L(hero.ctaLabel) || t.bookDemo}</CtaButton>
          </div>
          <PhoneFrame>
            {hero.phoneImageUrl ? <PhoneImg src={hero.phoneImageUrl} alt="" /> : <PhonePlaceholder>YOOZ</PhonePlaceholder>}
          </PhoneFrame>
        </HeroInner>
      </Hero>

      {audiences.length > 0 && (
        <Section id="audiences">
          <SectionTitle>{t.navAudiences}</SectionTitle>
          <Grid>
            {audiences.map((a) => (
              <Card key={a.key}>
                <CardImg src={a.imageUrl} />
                <CardBody>
                  <CardTitle>{L(a.title)}</CardTitle>
                  <CardDesc>{L(a.description)}</CardDesc>
                  {a.projects.length > 0 && (
                    <ProjectList>
                      {a.projects.map((p, i) => (
                        <li key={i}>
                          {p.linkUrl ? (
                            <ProjectLink href={p.linkUrl} target="_blank" rel="noreferrer">{L(p.title)}</ProjectLink>
                          ) : (
                            <strong>{L(p.title)}</strong>
                          )}
                          {L(p.description) ? ` — ${L(p.description)}` : ''}
                        </li>
                      ))}
                    </ProjectList>
                  )}
                </CardBody>
              </Card>
            ))}
          </Grid>
        </Section>
      )}

      <Section id="engine">
        <SectionTitle>{L(engine.title)}</SectionTitle>
        <SectionIntro>{L(engine.intro)}</SectionIntro>
        <EngineWrap>
          <InfinityGraphic />
          <Boosters>
            {engine.boosters.map((b) => (
              <Booster key={b.key}>
                <BoosterIcon bg={BOOSTER_COLORS[b.key] || PURPLE_LIGHT}>
                  {b.imageUrl && <BoosterIconImg src={b.imageUrl} alt="" />}
                </BoosterIcon>
                <BoosterTitle>{L(b.title)}</BoosterTitle>
                <BoosterSub>{L(b.subtitle)}</BoosterSub>
                <BoosterDesc>{L(b.description)}</BoosterDesc>
              </Booster>
            ))}
          </Boosters>
        </EngineWrap>
      </Section>

      {customers.logos.length > 0 && (
        <Section id="customers">
          <SectionTitle>{L(customers.title) || t.navCustomers}</SectionTitle>
          <LogoRow>
            {customers.logos.map((c, i) => {
              const img = c.imageUrl ? <LogoImg src={c.imageUrl} alt={c.name} /> : <strong>{c.name}</strong>;
              return c.linkUrl ? (
                <a key={i} href={c.linkUrl} target="_blank" rel="noreferrer">{img}</a>
              ) : (
                <span key={i}>{img}</span>
              );
            })}
          </LogoRow>
        </Section>
      )}

      <ContactSection id="contact">
        <ContactInner>
          <ContactTitle>{L(contact.title) || t.navContact}</ContactTitle>
          <ContactMeta>
            {contact.email && <span>{t.emailLabel}: {contact.email}</span>}
            {contact.email && contact.phone && ' · '}
            {contact.phone && <span>{t.phoneLabel}: {contact.phone}</span>}
          </ContactMeta>
          <Form onSubmit={submit}>
            <Field placeholder={`${t.fieldName} *`} value={form.name} onChange={set('name')} />
            <Field placeholder={t.fieldCompany} value={form.company} onChange={set('company')} />
            <Field placeholder={t.fieldPosition} value={form.position} onChange={set('position')} />
            <Field placeholder={`${t.fieldEmail} *`} type="email" value={form.email} onChange={set('email')} />
            <Field placeholder={`${t.fieldPhone} *`} value={form.phone} onChange={set('phone')} />
            <FieldWide placeholder={t.fieldMessage} value={form.message} onChange={set('message')} />
            <SubmitRow>
              <SendBtn type="submit" disabled={status === 'sending'}>
                {status === 'sending' ? t.sending : t.send}
              </SendBtn>
              {status === 'ok' && <FormNote>{t.successMsg}</FormNote>}
              {status === 'error' && <FormNote error>{t.errorMsg}</FormNote>}
              {status === 'required' && <FormNote error>{t.requiredMsg}</FormNote>}
            </SubmitRow>
          </Form>
        </ContactInner>
      </ContactSection>
    </Page>
  );
}
