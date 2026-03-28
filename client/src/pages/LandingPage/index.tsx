import { useNavigate } from 'react-router-dom';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './LandingPage.i18n';
import NatureBackground from '../../components/NatureBackground';
import LangDrawer from '../../components/LangDrawer';
import { styled, keyframes } from '@mui/material/styles';

// ─── Colors ───

const C_DARK_GREEN = '#33691e';
const C_GREEN = '#689f38';
const C_YELLOW = '#ffca28';

// ─── Animations ───

const fadeInUp = keyframes`
  0% { opacity: 0; transform: translateY(24px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

// ─── Styled Components ───

const Page = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100dvh',
});

const LangCorner = styled('div')({
  position: 'absolute',
  top: 12,
  right: 12,
  zIndex: 10,
});

const Content = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '40px 24px 32px',
  position: 'relative',
});

const Tagline = styled('div')({
  fontSize: 16,
  fontWeight: 700,
  color: '#fff',
  textShadow: '0 1px 4px rgba(0,0,0,0.3)',
  marginBottom: 8,
  background: `linear-gradient(90deg, #fff, ${C_YELLOW}, #fff)`,
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  animation: `${fadeInUp} 0.5s ease-out 0.45s both, ${shimmer} 4s linear 1.5s infinite`,
});

const Subtitle = styled('p')({
  fontSize: 13,
  color: 'rgba(255,255,255,0.85)',
  textAlign: 'center',
  lineHeight: 1.6,
  maxWidth: 320,
  margin: '0 0 32px',
  animation: `${fadeInUp} 0.5s ease-out 0.55s both`,
});

const FeatureCards = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: '100%',
  maxWidth: 340,
  marginBottom: 28,
});

const FeatureCard = styled('div')<{ delay?: number }>(({ delay = 0 }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  background: 'rgba(255,255,255,0.92)',
  borderRadius: 20,
  padding: '14px 16px',
  boxShadow: '0 3px 12px rgba(0,0,0,0.12)',
  animation: `${fadeInUp} 0.45s ease-out ${0.65 + delay * 0.12}s both`,
  transition: 'transform 0.2s',
}));

const FeatureIconWrap = styled('div')<{ bg: string }>(({ bg }) => ({
  width: 48,
  height: 48,
  borderRadius: 14,
  background: bg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  animation: `${float} 3s ease-in-out infinite`,
}));

const FeatureInfo = styled('div')({
  flex: 1,
  minWidth: 0,
});

const FeatureTitle = styled('div')({
  fontSize: 15,
  fontWeight: 800,
  color: C_DARK_GREEN,
  marginBottom: 2,
});

const FeatureDesc = styled('div')({
  fontSize: 12,
  color: '#666',
  lineHeight: 1.4,
});

const CTASection = styled('div')({
  textAlign: 'center',
  animation: `${fadeInUp} 0.5s ease-out 1.1s both`,
  marginBottom: 24,
});

const CTATitle = styled('div')({
  fontSize: 18,
  fontWeight: 800,
  color: '#fff',
  textShadow: '0 1px 4px rgba(0,0,0,0.3)',
  marginBottom: 6,
});

const CTADesc = styled('div')({
  fontSize: 13,
  color: 'rgba(255,255,255,0.8)',
  marginBottom: 8,
});

const FooterLinks = styled('div')({
  display: 'flex',
  gap: 16,
  justifyContent: 'center',
  animation: `${fadeInUp} 0.5s ease-out 1.3s both`,
});

const FooterLink = styled('button')({
  background: 'transparent',
  border: '1.5px solid rgba(255,255,255,0.4)',
  borderRadius: 50,
  padding: '8px 20px',
  color: 'rgba(255,255,255,0.85)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  '&:hover': {
    background: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.6)',
    color: '#fff',
  },
});

// ─── SVG Icons ───

function GamesIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
      <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
    </svg>
  );
}

function RoadmapIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
    </svg>
  );
}

function LeaderboardIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

// ─── Component ───

export default function LandingPage() {
  const t = useTranslations(texts);
  const navigate = useNavigate();

  return (
    <NatureBackground>
      <Page>
        <LangCorner>
          <LangDrawer />
        </LangCorner>

        <Content>
          <img src="/images/logo-purple.png" alt="Yooz" style={{ width: 120, marginBottom: 16 }} />
          <Tagline>{t.heroTagline}</Tagline>
          <Subtitle>{t.heroSubtitle}</Subtitle>

          <FeatureCards>
            <FeatureCard delay={0}>
              <FeatureIconWrap bg={C_GREEN}>
                <GamesIcon />
              </FeatureIconWrap>
              <FeatureInfo>
                <FeatureTitle>{t.featureGamesTitle}</FeatureTitle>
                <FeatureDesc>{t.featureGamesDesc}</FeatureDesc>
              </FeatureInfo>
            </FeatureCard>

            <FeatureCard delay={1}>
              <FeatureIconWrap bg="#e57373">
                <RoadmapIcon />
              </FeatureIconWrap>
              <FeatureInfo>
                <FeatureTitle>{t.featureRoadmapTitle}</FeatureTitle>
                <FeatureDesc>{t.featureRoadmapDesc}</FeatureDesc>
              </FeatureInfo>
            </FeatureCard>

            <FeatureCard delay={2}>
              <FeatureIconWrap bg={C_YELLOW}>
                <LeaderboardIcon />
              </FeatureIconWrap>
              <FeatureInfo>
                <FeatureTitle>{t.featureLeaderboardTitle}</FeatureTitle>
                <FeatureDesc>{t.featureLeaderboardDesc}</FeatureDesc>
              </FeatureInfo>
            </FeatureCard>
          </FeatureCards>

          <CTASection>
            <CTATitle>{t.ctaTitle}</CTATitle>
            <CTADesc>{t.ctaDesc}</CTADesc>
          </CTASection>

          <FooterLinks>
            <FooterLink onClick={() => navigate('/admin/login')}>
              {t.adminLink}
            </FooterLink>
            <FooterLink onClick={() => navigate('/manager')}>
              {t.managerLink}
            </FooterLink>
          </FooterLinks>
        </Content>
      </Page>
    </NatureBackground>
  );
}
