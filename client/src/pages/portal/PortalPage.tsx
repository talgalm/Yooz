import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { styled, keyframes } from '@mui/material/styles';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './PortalPage.i18n';
import { isGoogleAuthAvailable, openGooglePopup, fetchGoogleEmail } from '../../utils/googleAuth';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── Animations ───

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const slideIn = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

const fadeInBg = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// ─── Auth screens (purple) ───

const PurplePage = styled('div')({
  position: 'fixed',
  inset: 0,
  background: '#8B2FC9',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 24px',
  boxSizing: 'border-box',
  overflow: 'auto',
});

const LogoImg = styled('img')({
  width: 140,
  maxWidth: '40%',
  objectFit: 'contain',
  marginBottom: 32,
  animation: `${fadeIn} 0.8s ease-out`,
});

const Heading = styled('h1')({
  fontSize: 32,
  fontWeight: 800,
  color: '#fff',
  margin: '0 0 8px',
  textAlign: 'center',
  animation: `${fadeIn} 0.8s ease-out 0.1s both`,
});

const SubHeading = styled('p')({
  fontSize: 16,
  fontWeight: 500,
  color: 'rgba(255,255,255,0.8)',
  margin: '0 0 32px',
  textAlign: 'center',
  animation: `${fadeIn} 0.8s ease-out 0.2s both`,
});

const FormWrapper = styled('div')({
  width: '100%',
  maxWidth: 400,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  animation: `${fadeIn} 0.8s ease-out 0.3s both`,
});

const LoginInput = styled('input')({
  width: '100%',
  padding: '16px 20px',
  fontSize: 16,
  border: 'none',
  borderRadius: 12,
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
  textAlign: 'start',
  fontFamily: 'inherit',
  '&::placeholder': { color: '#aaa' },
});

const LoginButton = styled('button')({
  width: '100%',
  padding: 16,
  fontSize: 18,
  fontWeight: 700,
  color: '#fff',
  background: 'rgba(255,255,255,0.25)',
  border: '2px solid rgba(255,255,255,0.4)',
  borderRadius: 12,
  cursor: 'pointer',
  transition: 'background 0.2s, transform 0.1s',
  fontFamily: 'inherit',
  textAlign: 'center',
  '&:active': { transform: 'scale(0.98)' },
  '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
});

const SwitchLink = styled('button')({
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.7)',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  textDecoration: 'underline',
  textAlign: 'center',
  padding: 0,
  transition: 'color 0.2s',
  '&:hover': { color: '#fff' },
});

const GoogleButton = styled('button')({
  width: '100%',
  padding: 14,
  fontSize: 16,
  fontWeight: 600,
  color: '#333',
  background: '#fff',
  border: 'none',
  borderRadius: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  transition: 'transform 0.1s',
  '&:active': { transform: 'scale(0.98)' },
  '&:disabled': { opacity: 0.6, cursor: 'not-allowed' },
});

const LoginDivider = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  color: 'rgba(255,255,255,0.7)',
  fontSize: 14,
  '&::before, &::after': {
    content: '""',
    flex: 1,
    height: 1,
    background: 'rgba(255,255,255,0.3)',
  },
});

const ErrorBox = styled('div')({
  background: 'rgba(255,82,82,0.15)',
  border: '1px solid rgba(255,82,82,0.3)',
  borderRadius: 10,
  padding: '10px 16px',
  color: '#ffcdd2',
  fontSize: 14,
  fontWeight: 600,
  textAlign: 'center',
});

const WaitingIcon = styled('div')({
  width: 64,
  height: 64,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 24,
  animation: `${pulse} 2s ease-in-out infinite`,
});

const WaitingText = styled('h2')({
  fontSize: 22,
  fontWeight: 700,
  color: '#fff',
  margin: '0 0 12px',
  textAlign: 'center',
});

const WaitingDescription = styled('p')({
  fontSize: 15,
  color: 'rgba(255,255,255,0.75)',
  margin: '0 0 32px',
  textAlign: 'center',
  maxWidth: 340,
  lineHeight: 1.6,
});

const SpinnerEl = styled('div')({
  width: 36,
  height: 36,
  border: '3px solid rgba(255,255,255,0.2)',
  borderTopColor: '#fff',
  borderRadius: '50%',
  animation: `${spin} 0.8s linear infinite`,
  margin: '80px auto',
});

// ─── Portal Shell (header + sidebar + content) ───

const ShellWrap = styled('div')({
  minHeight: '100vh',
  background: '#f7f5fa',
  display: 'flex',
  flexDirection: 'column',
});

const Header = styled('header')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  height: 64,
  background: 'linear-gradient(135deg, #6c5ce7 0%, #8B2FC9 100%)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  boxShadow: '0 2px 16px rgba(108,92,231,0.25)',
});

const HeaderRight = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
});

const HeaderLeft = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
});

const HamburgerBtn = styled('button')({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: 8,
  background: 'rgba(255,255,255,0.15)',
  border: 'none',
  cursor: 'pointer',
  borderRadius: 8,
  transition: 'background 0.15s',
  '&:hover': { background: 'rgba(255,255,255,0.25)' },
});

const HamburgerLine = styled('span')({
  display: 'block',
  width: 20,
  height: 2,
  background: '#fff',
  borderRadius: 2,
});

const HeaderGreeting = styled('span')({
  fontSize: 15,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.9)',
  '@media (max-width: 480px)': { display: 'none' },
});

const HeaderUsername = styled('span')({
  fontSize: 15,
  fontWeight: 700,
  color: '#fff',
});

const UserAvatar = styled('div')({
  width: 34,
  height: 34,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.2)',
  border: '2px solid rgba(255,255,255,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 15,
  fontWeight: 700,
  color: '#fff',
});

const HeaderLogoImg = styled('img')({
  height: 26,
  filter: 'brightness(0) invert(1)',
  opacity: 0.9,
});

const LogoutButton = styled('button')({
  padding: '6px 16px',
  borderRadius: 8,
  border: '1.5px solid rgba(255,255,255,0.35)',
  background: 'rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.9)',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'all 0.15s',
  '&:hover': { background: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.5)' },
});

// ─── Sidebar ───

const SidebarBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.35)',
  zIndex: 200,
  animation: `${fadeInBg} 0.15s ease-out`,
});

const SidebarPanel = styled('nav')({
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  width: 280,
  maxWidth: '80vw',
  background: '#fff',
  zIndex: 201,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
  animation: `${slideIn} 0.2s ease-out`,
});

const SidebarHeader = styled('div')({
  padding: '20px 24px 16px',
  borderBottom: '1px solid #ece8f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

const SidebarTitle = styled('span')({
  fontSize: 18,
  fontWeight: 700,
  color: '#333',
});

const SidebarCloseBtn = styled('button')({
  background: 'none',
  border: 'none',
  fontSize: 22,
  color: '#999',
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 6,
  '&:hover': { background: '#f5f5f7' },
});

const SidebarNav = styled('div')({
  flex: 1,
  padding: '12px 0',
  overflowY: 'auto',
});

const SidebarItem = styled('button')<{ active?: boolean }>(({ active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '14px 24px',
  fontSize: 15,
  fontWeight: active ? 700 : 500,
  color: active ? '#6c5ce7' : '#555',
  background: active ? '#f0eefa' : 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textAlign: 'start',
  transition: 'all 0.15s',
  '&:hover': { background: active ? '#f0eefa' : '#f9f9fb' },
}));

const SidebarIcon = styled('span')({
  fontSize: 18,
  width: 24,
  textAlign: 'center',
});

// ─── Content area ───

const ContentArea = styled('main')({
  flex: 1,
  padding: '24px 20px 48px',
  maxWidth: 800,
  margin: '0 auto',
  width: '100%',
  boxSizing: 'border-box',
});

const PageTitle = styled('h2')({
  fontSize: 22,
  fontWeight: 700,
  color: '#333',
  margin: '0 0 20px',
});

// ─── Activities grid ───

const ActivitiesGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: 16,
  '@media (max-width: 520px)': {
    gridTemplateColumns: '1fr',
  },
});

const ActivityCard = styled('div')({
  background: '#fff',
  borderRadius: 16,
  padding: '20px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  border: '1px solid #ece8f0',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  transition: 'box-shadow 0.2s',
  '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
});

const ActivityName = styled('span')({
  fontSize: 16,
  fontWeight: 700,
  color: '#333',
});

const ActivityStatusBadge = styled('span')<{ activityStatus: 'open' | 'closed' | 'inProgress' }>(({ activityStatus }) => ({
  display: 'inline-block',
  padding: '3px 10px',
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 6,
  alignSelf: 'flex-start',
  background: activityStatus === 'open' ? '#e8f5e9' : activityStatus === 'inProgress' ? '#fff8e1' : '#ffebee',
  color: activityStatus === 'open' ? '#2e7d32' : activityStatus === 'inProgress' ? '#e65100' : '#c62828',
}));

const PlayBtn = styled('button')({
  padding: '10px 20px',
  borderRadius: 10,
  border: 'none',
  background: '#6c5ce7',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'background 0.2s, transform 0.1s',
  alignSelf: 'stretch',
  textAlign: 'center',
  '&:hover': { background: '#5b4fcf' },
  '&:active': { transform: 'scale(0.98)' },
});

const EmptyState = styled('div')({
  textAlign: 'center',
  padding: '40px 20px',
  color: '#aaa',
  fontSize: 15,
  fontWeight: 500,
  background: '#fafafe',
  borderRadius: 14,
  border: '2px dashed #e0dce8',
});

// ─── History ───

const StatsHero = styled('div')({
  background: 'linear-gradient(135deg, #6c5ce7 0%, #8B2FC9 60%, #a855f7 100%)',
  borderRadius: 20,
  padding: '28px 24px 24px',
  marginBottom: 24,
  color: '#fff',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: -30,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
  },
});

const StatsHeroTitle = styled('h3')({
  fontSize: 18,
  fontWeight: 700,
  margin: '0 0 20px',
  opacity: 0.95,
});

const StatsGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 12,
  position: 'relative',
  zIndex: 1,
  '@media (max-width: 560px)': {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
  },
});

const StatBox = styled('div')({
  background: 'rgba(255,255,255,0.15)',
  backdropFilter: 'blur(8px)',
  borderRadius: 14,
  padding: '16px 12px',
  textAlign: 'center',
  border: '1px solid rgba(255,255,255,0.12)',
});

const StatValue = styled('div')({
  fontSize: 28,
  fontWeight: 800,
  lineHeight: 1.1,
  marginBottom: 4,
});

const StatLabel = styled('div')({
  fontSize: 11,
  fontWeight: 600,
  opacity: 0.75,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
});

const HistorySectionTitle = styled('h3')({
  fontSize: 16,
  fontWeight: 700,
  color: '#444',
  margin: '0 0 14px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

const HistoryCard = styled('div')({
  background: '#fff',
  borderRadius: 16,
  padding: '18px 20px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  border: '1px solid #ece8f0',
  marginBottom: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  transition: 'transform 0.15s, box-shadow 0.15s',
  animation: `${fadeIn} 0.4s ease-out both`,
  '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
});

const HistoryRow = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 8,
});

const HistoryName = styled('span')({
  fontSize: 16,
  fontWeight: 700,
  color: '#333',
});

const HistoryMeta = styled('div')({
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  flexWrap: 'wrap',
});

const HistoryChip = styled('span')<{ variant?: 'purple' | 'green' | 'gold' | 'muted' }>(({ variant = 'muted' }) => {
  const styles = {
    purple: { bg: '#f0eefa', color: '#6c5ce7', border: '#e4ddf7' },
    green: { bg: '#e8f5e9', color: '#2e7d32', border: '#c8e6c9' },
    gold: { bg: '#fff8e1', color: '#e65100', border: '#ffecb3' },
    muted: { bg: '#f5f5f7', color: '#888', border: '#eee' },
  };
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 8,
    background: styles[variant].bg,
    color: styles[variant].color,
    border: `1px solid ${styles[variant].border}`,
  };
});

const CompletionBadge = styled('span')<{ cStatus: string }>(({ cStatus }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 12px',
  fontSize: 12,
  fontWeight: 700,
  borderRadius: 8,
  background: cStatus === 'completed' ? '#e8f5e9' : cStatus === 'in_progress' ? '#fff8e1' : '#f5f5f7',
  color: cStatus === 'completed' ? '#2e7d32' : cStatus === 'in_progress' ? '#e65100' : '#888',
  border: `1px solid ${cStatus === 'completed' ? '#c8e6c9' : cStatus === 'in_progress' ? '#ffecb3' : '#eee'}`,
}));

// ─── Profile ───

const ProfileHero = styled('div')({
  background: 'linear-gradient(135deg, #6c5ce7 0%, #8B2FC9 100%)',
  borderRadius: 20,
  padding: '32px 28px',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  gap: 20,
  marginBottom: 24,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
  },
});

const ProfileAvatarBig = styled('div')({
  width: 64,
  height: 64,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.2)',
  border: '3px solid rgba(255,255,255,0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 26,
  fontWeight: 800,
  color: '#fff',
  flexShrink: 0,
});

const ProfileHeroInfo = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

const ProfileHeroName = styled('span')({
  fontSize: 22,
  fontWeight: 700,
});

const ProfileHeroMember = styled('span')({
  fontSize: 13,
  opacity: 0.7,
  fontWeight: 500,
});

const ProfileCard = styled('div')({
  background: '#fff',
  borderRadius: 18,
  padding: '24px 28px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  border: '1px solid #ece8f0',
  maxWidth: 480,
});

const ProfileCardTitle = styled('h3')({
  fontSize: 16,
  fontWeight: 700,
  color: '#333',
  margin: '0 0 4px',
});

const ProfileCardDesc = styled('p')({
  fontSize: 13,
  color: '#888',
  margin: '0 0 20px',
  fontWeight: 500,
});

const ProfileField = styled('div')({
  marginBottom: 18,
});

const ProfileLabel = styled('label')({
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#555',
  marginBottom: 6,
});

const ProfileInput = styled('input')({
  width: '100%',
  padding: '12px 16px',
  borderRadius: 12,
  border: '1.5px solid #e0dce8',
  fontSize: 14,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  background: '#fafafe',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  '&:focus': { outline: 'none', borderColor: '#6c5ce7', boxShadow: '0 0 0 3px rgba(108,92,231,0.1)' },
  '&:disabled': { background: '#f0f0f4', color: '#888' },
});

const ProfileSaveBtn = styled('button')({
  padding: '12px 32px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg, #6c5ce7, #8B2FC9)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'transform 0.1s, box-shadow 0.2s',
  boxShadow: '0 2px 12px rgba(108,92,231,0.25)',
  '&:hover': { boxShadow: '0 4px 20px rgba(108,92,231,0.35)' },
  '&:active': { transform: 'scale(0.98)' },
  '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
});

const ProfileMsg = styled('div')<{ isError?: boolean }>(({ isError }) => ({
  marginTop: 12,
  fontSize: 13,
  fontWeight: 600,
  padding: '8px 14px',
  borderRadius: 8,
  background: isError ? '#ffebee' : '#e8f5e9',
  color: isError ? '#c62828' : '#2e7d32',
}));

// ─── Types ───

interface PortalActivity {
  _id: string;
  name: string;
  code: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

interface PortalInfo {
  name: string;
  code: string;
  description?: string;
  activities: PortalActivity[];
}

interface HistoryItem {
  activityCode: string;
  activityName: string;
  completionStatus: string;
  totalScore: number | null;
  joinedAt: string;
  sessionCompletedAt: string | null;
  sessionDurationMs: number | null;
  position: number | null;
}

type AuthMode = 'login' | 'register' | 'pending' | 'denied';
type Tab = 'activities' | 'competitions' | 'history' | 'profile';

const TOKEN_KEY = 'yooz_portal_token';
const USER_KEY = 'yooz_portal_user';

function getActivityStatus(a: PortalActivity): 'open' | 'closed' | 'inProgress' {
  const now = new Date();
  if (a.scheduledStart && new Date(a.scheduledStart) > now) return 'closed';
  if (a.scheduledEnd && new Date(a.scheduledEnd) < now) return 'closed';
  if (a.scheduledStart && new Date(a.scheduledStart) <= now) return 'inProgress';
  return 'open';
}

export default function PortalPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const t = useTranslations(texts);

  // Read invite token from URL query param (?invite=xxx)
  const inviteToken = new URLSearchParams(window.location.search).get('invite') || '';

  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Auth
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState('');

  // Portal shell
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('activities');

  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySort, setHistorySort] = useState<'date' | 'score'>('date');

  // Force password change
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [forceNewPw, setForceNewPw] = useState('');
  const [forceConfirmPw, setForceConfirmPw] = useState('');
  const [forceError, setForceError] = useState('');
  const [forceSaving, setForceSaving] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  // Profile
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Check existing token
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);
    if (token && user) {
      setIsLoggedIn(true);
      setLoggedInUser(user);
    }
  }, []);

  // Fetch portal info
  useEffect(() => {
    if (!code) return;
    fetch(`${API_BASE}/api/admin/portals/public/${code}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setPortal(data.portal); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [code]);

  // Fetch history when tab switches
  const fetchHistory = useCallback(async () => {
    if (!code || !loggedInUser) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/portals/public/${code}/history?username=${encodeURIComponent(loggedInUser)}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history);
      }
    } catch {}
    setHistoryLoading(false);
  }, [code, loggedInUser]);

  useEffect(() => {
    if (activeTab === 'history' && isLoggedIn) fetchHistory();
  }, [activeTab, isLoggedIn, fetchHistory]);

  // Auth handlers
  const handleLogin = async () => {
    setAuthError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/portals/public/${code}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (res.status === 403) {
        setAuthMode(data.error === 'pending_approval' ? 'pending' : 'denied');
        setSubmitting(false);
        return;
      }
      if (!res.ok) { setAuthError(t.loginError); setSubmitting(false); return; }
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, data.user.username);
      setLoggedInUser(data.user.username);
      if (data.mustChangePassword) {
        setMustChangePassword(true);
        setTempPassword(password);
      }
      setIsLoggedIn(true);
    } catch { setAuthError(t.loginError); } finally { setSubmitting(false); }
  };

  const handleRegister = async () => {
    setAuthError('');
    if (password.length < 4) { setAuthError(t.passwordTooShort); return; }
    setSubmitting(true);
    try {
      const body: Record<string, string> = { username: username.trim(), password };
      if (inviteToken) body.inviteToken = inviteToken;
      const res = await fetch(`${API_BASE}/api/admin/portals/public/${code}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 409) { setAuthError(t.usernameTaken); setSubmitting(false); return; }
      if (!res.ok) { setAuthError(data.error || t.loginError); setSubmitting(false); return; }
      // Auto-approved via invite link — log in directly
      if (data.status === 'approved' && data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, data.user.username);
        setLoggedInUser(data.user.username);
        setIsLoggedIn(true);
      } else {
        setAuthMode('pending');
      }
    } catch { setAuthError(t.loginError); } finally { setSubmitting(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setIsLoggedIn(false);
    setLoggedInUser('');
    setUsername('');
    setPassword('');
    setAuthError('');
    setAuthMode('login');
    setActiveTab('activities');
    setSidebarOpen(false);
  };

  const handleAuthSubmit = () => {
    if (authMode === 'login') handleLogin();
    else if (authMode === 'register') handleRegister();
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    setSubmitting(true);
    try {
      const accessToken = await openGooglePopup();
      const email = await fetchGoogleEmail(accessToken);
      const res = await fetch(`${API_BASE}/api/admin/portals/public/${code}/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...(inviteToken ? { inviteToken } : {}) }),
      });
      const data = await res.json();
      if (res.status === 403) {
        setAuthMode(data.error === 'pending_approval' ? 'pending' : 'denied');
        setSubmitting(false);
        return;
      }
      if (!res.ok) { setAuthError(t.loginError); setSubmitting(false); return; }
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, data.user.username);
      setLoggedInUser(data.user.username);
      setIsLoggedIn(true);
    } catch (err) {
      if (err instanceof Error && err.message !== 'Popup closed') {
        setAuthError(t.loginError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForcePasswordChange = async () => {
    setForceError('');
    if (forceNewPw.length < 4) { setForceError(t.passwordTooShortChange); return; }
    if (forceNewPw !== forceConfirmPw) { setForceError(t.passwordsMismatch); return; }
    setForceSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/portals/public/${code}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loggedInUser,
          currentPassword: tempPassword,
          newPassword: forceNewPw,
        }),
      });
      if (!res.ok) { setForceError(t.profileError); return; }
      setMustChangePassword(false);
      setTempPassword('');
      setForceNewPw('');
      setForceConfirmPw('');
    } catch {
      setForceError(t.profileError);
    } finally {
      setForceSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileMsg('');
    setProfileError(false);
    if (!currentPw) return;
    setProfileSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/portals/public/${code}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loggedInUser,
          currentPassword: currentPw,
          newPassword: newPw || undefined,
        }),
      });
      const data = await res.json();
      if (data.error === 'wrong_password') {
        setProfileMsg(t.wrongPassword);
        setProfileError(true);
      } else if (!res.ok) {
        setProfileMsg(t.profileError);
        setProfileError(true);
      } else {
        setProfileMsg(t.profileSaved);
        setCurrentPw('');
        setNewPw('');
      }
    } catch {
      setProfileMsg(t.profileError);
      setProfileError(true);
    } finally {
      setProfileSaving(false);
    }
  };

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  // ─── Loading ───
  if (loading) return <PurplePage><SpinnerEl /></PurplePage>;

  // ─── Not found ───
  if (notFound || !portal) {
    return <PurplePage><LogoImg src="/images/logo-white.png" alt="Yooz" /><ErrorBox>{t.portalNotFound}</ErrorBox></PurplePage>;
  }

  // ─── Auth screens ───
  if (!isLoggedIn) {
    if (authMode === 'pending') {
      return (
        <PurplePage>
          <LogoImg src="/images/logo-white.png" alt="Yooz" />
          <WaitingIcon>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </WaitingIcon>
          <WaitingText>{t.pendingApproval}</WaitingText>
          <WaitingDescription>{t.pendingDescription}</WaitingDescription>
          <SwitchLink onClick={() => { setAuthMode('login'); setAuthError(''); }}>{t.switchToLogin}</SwitchLink>
        </PurplePage>
      );
    }
    if (authMode === 'denied') {
      return (
        <PurplePage>
          <LogoImg src="/images/logo-white.png" alt="Yooz" />
          <WaitingIcon style={{ background: 'rgba(255,82,82,0.2)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff5252" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </WaitingIcon>
          <WaitingText>{t.denied}</WaitingText>
          <SwitchLink onClick={() => { setAuthMode('login'); setAuthError(''); }}>{t.switchToLogin}</SwitchLink>
        </PurplePage>
      );
    }

    const isRegister = authMode === 'register';
    return (
      <PurplePage>
        <LogoImg src="/images/logo-white.png" alt="Yooz" />
        <Heading>{portal.name}</Heading>
        {portal.description && <SubHeading>{portal.description}</SubHeading>}
        <FormWrapper>
          {authError && <ErrorBox>{authError}</ErrorBox>}
          <LoginInput placeholder={t.username} value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()} autoComplete="username" />
          <LoginInput type="password" placeholder={t.password} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()} autoComplete={isRegister ? 'new-password' : 'current-password'} />
          <LoginButton onClick={handleAuthSubmit} disabled={submitting || !username.trim() || !password}>
            {submitting ? '...' : isRegister ? t.registerButton : t.loginButton}
          </LoginButton>
          {isGoogleAuthAvailable() && (
            <>
              <LoginDivider>{t.or}</LoginDivider>
              <GoogleButton type="button" onClick={handleGoogleLogin} disabled={submitting}>
                <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
                {t.googleSignIn}
              </GoogleButton>
            </>
          )}
          <SwitchLink onClick={() => { setAuthError(''); setAuthMode(isRegister ? 'login' : 'register'); }}>
            {isRegister ? t.switchToLogin : t.switchToRegister}
          </SwitchLink>
        </FormWrapper>
      </PurplePage>
    );
  }

  // ─── Force password change ───
  if (mustChangePassword) {
    return (
      <PurplePage>
        <LogoImg src="/images/logo-white.png" alt="Yooz" />
        <WaitingIcon style={{ background: 'rgba(255,255,255,0.15)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        </WaitingIcon>
        <WaitingText>{t.changePasswordTitle}</WaitingText>
        <WaitingDescription>{t.changePasswordDesc}</WaitingDescription>
        <FormWrapper>
          {forceError && <ErrorBox>{forceError}</ErrorBox>}
          <LoginInput
            type="password"
            placeholder={t.newPasswordLabel}
            value={forceNewPw}
            onChange={(e) => setForceNewPw(e.target.value)}
            autoComplete="new-password"
          />
          <LoginInput
            type="password"
            placeholder={t.confirmPasswordLabel}
            value={forceConfirmPw}
            onChange={(e) => setForceConfirmPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleForcePasswordChange()}
            autoComplete="new-password"
          />
          <LoginButton onClick={handleForcePasswordChange} disabled={forceSaving || !forceNewPw || !forceConfirmPw}>
            {forceSaving ? '...' : t.changePasswordButton}
          </LoginButton>
        </FormWrapper>
      </PurplePage>
    );
  }

  // ─── Logged-in shell ───
  return (
    <ShellWrap>
      {/* Header */}
      <Header>
        <HeaderRight>
          <HamburgerBtn onClick={() => setSidebarOpen(true)} aria-label={t.menu}>
            <HamburgerLine /><HamburgerLine /><HamburgerLine />
          </HamburgerBtn>
          <UserAvatar>{loggedInUser.charAt(0).toUpperCase()}</UserAvatar>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <HeaderGreeting>{t.greeting},</HeaderGreeting>
            <HeaderUsername>{loggedInUser}</HeaderUsername>
          </div>
        </HeaderRight>
        <HeaderLeft>
          <HeaderLogoImg src="/images/logo-purple.png" alt="Yooz" />
          <LogoutButton onClick={handleLogout}>{t.logout}</LogoutButton>
        </HeaderLeft>
      </Header>

      {/* Sidebar */}
      {sidebarOpen && (
        <SidebarBackdrop onClick={() => setSidebarOpen(false)}>
          <SidebarPanel onClick={(e) => e.stopPropagation()}>
            <SidebarHeader>
              <SidebarTitle>{t.menu}</SidebarTitle>
              <SidebarCloseBtn onClick={() => setSidebarOpen(false)}>×</SidebarCloseBtn>
            </SidebarHeader>
            <SidebarNav>
              <SidebarItem active={activeTab === 'activities'} onClick={() => selectTab('activities')}>
                <SidebarIcon>▦</SidebarIcon> {t.sidebarActivities}
              </SidebarItem>
              <SidebarItem active={activeTab === 'competitions'} onClick={() => selectTab('competitions')}>
                <SidebarIcon>★</SidebarIcon> {t.sidebarCompetitions}
              </SidebarItem>
              <SidebarItem active={activeTab === 'history'} onClick={() => selectTab('history')}>
                <SidebarIcon>⏱</SidebarIcon> {t.sidebarHistory}
              </SidebarItem>
              <SidebarItem active={activeTab === 'profile'} onClick={() => selectTab('profile')}>
                <SidebarIcon>⚙</SidebarIcon> {t.sidebarProfile}
              </SidebarItem>
            </SidebarNav>
          </SidebarPanel>
        </SidebarBackdrop>
      )}

      {/* Content */}
      <ContentArea>
        {/* Activities Tab */}
        {activeTab === 'activities' && (
          <>
            <PageTitle>{t.activitiesTitle}</PageTitle>
            {portal.activities.length === 0 ? (
              <EmptyState>{t.noActivities}</EmptyState>
            ) : (
              <ActivitiesGrid>
                {portal.activities.map((a) => {
                  const status = getActivityStatus(a);
                  return (
                    <ActivityCard key={a._id}>
                      <ActivityStatusBadge activityStatus={status}>
                        {status === 'open' ? t.statusOpen : status === 'inProgress' ? t.statusInProgress : t.statusClosed}
                      </ActivityStatusBadge>
                      <ActivityName>{a.name}</ActivityName>
                      <PlayBtn onClick={() => navigate(`/play/${a.code}`)}>
                        {t.play}
                      </PlayBtn>
                    </ActivityCard>
                  );
                })}
              </ActivitiesGrid>
            )}
          </>
        )}

        {/* Competitions Tab */}
        {activeTab === 'competitions' && (
          <>
            <PageTitle>{t.competitionsTitle}</PageTitle>
            <EmptyState>{t.competitionsComingSoon}</EmptyState>
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <>
            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ width: 28, height: 28, border: '3px solid #e8e4ee', borderTopColor: '#6c5ce7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : history.length === 0 ? (
              <EmptyState>{t.noHistory}</EmptyState>
            ) : (
              <>
                {/* Stats Hero */}
                {(() => {
                  const completedCount = history.filter(h => h.completionStatus === 'completed').length;
                  const withScores = history.filter(h => h.totalScore != null && h.totalScore > 0);
                  const totalScore = withScores.reduce((s, h) => s + (h.totalScore || 0), 0);
                  const avgScore = withScores.length > 0 ? Math.round(totalScore / withScores.length) : 0;
                  const bestPosition = history.filter(h => h.position != null).reduce((best, h) => h.position != null && (best === null || h.position < best) ? h.position : best, null as number | null);
                  return (
                    <StatsHero>
                      <StatsHeroTitle>{t.yourJourney}</StatsHeroTitle>
                      <StatsGrid>
                        <StatBox>
                          <StatValue>{completedCount}</StatValue>
                          <StatLabel>{t.statsCompleted}</StatLabel>
                        </StatBox>
                        <StatBox>
                          <StatValue>{avgScore}</StatValue>
                          <StatLabel>{t.statsAvgScore}</StatLabel>
                        </StatBox>
                        <StatBox>
                          <StatValue>{totalScore.toLocaleString()}</StatValue>
                          <StatLabel>{t.statsTotalScore}</StatLabel>
                        </StatBox>
                        <StatBox>
                          <StatValue>{bestPosition != null ? `#${bestPosition}` : '—'}</StatValue>
                          <StatLabel>{t.statsBestPosition}</StatLabel>
                        </StatBox>
                      </StatsGrid>
                    </StatsHero>
                  );
                })()}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <HistorySectionTitle style={{ margin: 0 }}>
                    {t.recentActivity}
                  </HistorySectionTitle>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setHistorySort('date')}
                      style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                        border: historySort === 'date' ? '1.5px solid #6c5ce7' : '1.5px solid #e0dce8',
                        background: historySort === 'date' ? '#f0eefa' : '#fff',
                        color: historySort === 'date' ? '#6c5ce7' : '#888',
                      }}
                    >{t.sortByDate}</button>
                    <button
                      onClick={() => setHistorySort('score')}
                      style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                        border: historySort === 'score' ? '1.5px solid #6c5ce7' : '1.5px solid #e0dce8',
                        background: historySort === 'score' ? '#f0eefa' : '#fff',
                        color: historySort === 'score' ? '#6c5ce7' : '#888',
                      }}
                    >{t.sortByScore}</button>
                  </div>
                </div>

                {[...history].sort((a, b) => {
                  if (historySort === 'score') return (b.totalScore || 0) - (a.totalScore || 0);
                  return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
                }).map((h, i) => (
                  <HistoryCard key={i} style={{ animationDelay: `${i * 0.06}s` }}>
                    <HistoryRow>
                      <HistoryName>{h.activityName}</HistoryName>
                      <CompletionBadge cStatus={h.completionStatus}>
                        {h.completionStatus === 'completed' ? t.completed : h.completionStatus === 'in_progress' ? t.inProgress : t.joined}
                      </CompletionBadge>
                    </HistoryRow>
                    <HistoryMeta>
                      {h.totalScore != null && (
                        <HistoryChip variant="purple">{t.score}: {h.totalScore}</HistoryChip>
                      )}
                      {h.position != null && (
                        <HistoryChip variant="purple">{t.position}: #{h.position}</HistoryChip>
                      )}
                      <HistoryChip variant="purple">
                        {new Date(h.joinedAt).toLocaleDateString()}
                      </HistoryChip>
                    </HistoryMeta>
                  </HistoryCard>
                ))}
              </>
            )}
          </>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <>
            <ProfileHero>
              <ProfileAvatarBig>{loggedInUser.charAt(0).toUpperCase()}</ProfileAvatarBig>
              <ProfileHeroInfo>
                <ProfileHeroName>{loggedInUser}</ProfileHeroName>
                <ProfileHeroMember>{portal.name}</ProfileHeroMember>
              </ProfileHeroInfo>
            </ProfileHero>

            <ProfileCard>
              <ProfileCardTitle>{t.profileSecurityTitle}</ProfileCardTitle>
              <ProfileCardDesc>{t.profileSecurityDesc}</ProfileCardDesc>
              <ProfileField>
                <ProfileLabel>{t.username}</ProfileLabel>
                <ProfileInput value={loggedInUser} disabled />
              </ProfileField>
              <ProfileField>
                <ProfileLabel>{t.currentPassword}</ProfileLabel>
                <ProfileInput type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
              </ProfileField>
              <ProfileField>
                <ProfileLabel>{t.newPassword}</ProfileLabel>
                <ProfileInput type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              </ProfileField>
              <ProfileSaveBtn onClick={handleSaveProfile} disabled={profileSaving || !currentPw}>
                {profileSaving ? '...' : t.saveProfile}
              </ProfileSaveBtn>
              {profileMsg && <ProfileMsg isError={profileError}>{profileMsg}</ProfileMsg>}
            </ProfileCard>
          </>
        )}
      </ContentArea>
    </ShellWrap>
  );
}
