import { styled, keyframes } from '@mui/material/styles';

// ─── Animations ───

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.3); }
  to { opacity: 1; transform: scale(1); }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

// ─── Layout ───

export const BallGameContainer = styled('div')({
  position: 'fixed',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  background: '#000',
  zIndex: 100,
  overflow: 'hidden',
});

export const IntroOverlay = styled('div')({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 24,
  background: 'linear-gradient(180deg, #2d1b69 0%, #1a0a3e 100%)',
  zIndex: 20,
  padding: 32,
  animation: `${fadeIn} 600ms ease both`,
});

export const IntroTitle = styled('h1')({
  color: '#fff',
  fontSize: 28,
  fontWeight: 800,
  margin: 0,
  textAlign: 'center',
  textShadow: '0 2px 8px rgba(139, 47, 201, 0.5)',
});

export const IntroText = styled('p')({
  color: 'rgba(255,255,255,0.85)',
  fontSize: 16,
  lineHeight: 1.6,
  textAlign: 'center',
  maxWidth: 320,
  margin: 0,
});

export const StartButton = styled('button')({
  background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
  color: '#fff',
  fontSize: 20,
  fontWeight: 800,
  padding: '14px 48px',
  borderRadius: 40,
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 4px 20px rgba(231, 76, 60, 0.5)',
  transition: 'transform 0.15s ease',
  '&:active': { transform: 'scale(0.95)' },
});

// ─── Top Bar ───

export const TopBar = styled('div')({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  zIndex: 15,
  background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
});

export const TopBarItem = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  textShadow: '0 1px 4px rgba(0,0,0,0.5)',
});

export const TimerText = styled('span')<{ warning?: boolean }>(({ warning }) => ({
  fontSize: 18,
  fontWeight: 800,
  color: warning ? '#e74c3c' : '#fff',
  minWidth: 32,
  textAlign: 'center',
}));

export const MuteButton = styled('button')({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
  '& img': { width: 24, height: 24 },
});

// ─── Question Phase ───

export const QuestionOverlay = styled('div')({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 12,
  padding: '60px 16px 16px',
  animation: `${fadeIn} 400ms ease both`,
});

export const QuestionCard = styled('div')({
  background: 'rgba(45, 27, 105, 0.92)',
  backdropFilter: 'blur(10px)',
  borderRadius: 20,
  padding: '20px 24px',
  marginBottom: 20,
  maxWidth: 340,
  width: '100%',
  border: '2px solid rgba(139, 47, 201, 0.4)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
});

export const QuestionText = styled('div')({
  color: '#fff',
  fontSize: 18,
  fontWeight: 700,
  textAlign: 'center',
  lineHeight: 1.5,
});

export const OptionsGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
  maxWidth: 340,
  width: '100%',
});

export const OptionButton = styled('button')<{
  state: 'default' | 'correct' | 'wrong' | 'reveal' | 'disabled';
}>(({ state }) => ({
  position: 'relative',
  padding: '14px 12px',
  borderRadius: 14,
  fontSize: 15,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: state === 'default' ? 'pointer' : 'default',
  transition: 'all 0.2s ease',
  border: '2px solid',
  textAlign: 'center',
  lineHeight: 1.3,
  minHeight: 52,
  ...(state === 'default' && {
    background: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.3)',
    color: '#fff',
    '&:active': { transform: 'scale(0.96)' },
  }),
  ...(state === 'correct' && {
    background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
    borderColor: '#27ae60',
    color: '#fff',
    animation: `${scaleIn} 300ms ease`,
  }),
  ...(state === 'wrong' && {
    background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
    borderColor: '#e74c3c',
    color: '#fff',
    animation: `${scaleIn} 300ms ease`,
  }),
  ...(state === 'reveal' && {
    background: 'rgba(39, 174, 96, 0.3)',
    borderColor: '#27ae60',
    color: '#fff',
  }),
  ...(state === 'disabled' && {
    background: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.3)',
  }),
}));

export const FeedbackIcon = styled('div')<{ type: 'correct' | 'wrong' }>(({ type }) => ({
  position: 'absolute',
  top: -8,
  right: -8,
  width: 28,
  height: 28,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  fontWeight: 900,
  animation: `${scaleIn} 300ms ease`,
  ...(type === 'correct' && {
    background: '#27ae60',
    color: '#fff',
  }),
  ...(type === 'wrong' && {
    background: '#e74c3c',
    color: '#fff',
  }),
}));

// ─── Throwing Phase ───

export const ThrowingOverlay = styled('div')({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  zIndex: 14,
  background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
  pointerEvents: 'none',
});

export const ThrowText = styled('div')({
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  textShadow: '0 1px 4px rgba(0,0,0,0.5)',
});

export const SkipButton = styled('button')({
  background: 'rgba(255,255,255,0.15)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  padding: '8px 20px',
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.3)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  pointerEvents: 'auto',
  '&:active': { background: 'rgba(255,255,255,0.25)' },
});

export const BasketBonusPopup = styled('div')({
  position: 'absolute',
  top: '40%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
  color: '#fff',
  fontSize: 20,
  fontWeight: 800,
  padding: '12px 24px',
  borderRadius: 16,
  zIndex: 18,
  animation: `${scaleIn} 300ms ease, ${fadeOut} 600ms ease 800ms forwards`,
  boxShadow: '0 4px 20px rgba(243, 156, 18, 0.5)',
  pointerEvents: 'none',
});

// ─── Complete Phase ───

export const CompleteOverlay = styled('div')({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 20,
  background: 'linear-gradient(180deg, #1a0a3e 0%, #2d1b69 100%)',
  zIndex: 20,
  padding: 32,
  animation: `${fadeIn} 600ms ease both`,
});

export const CompleteTitle = styled('h1')({
  color: '#fff',
  fontSize: 28,
  fontWeight: 800,
  margin: 0,
  textShadow: '0 0 20px rgba(139, 47, 201, 0.5)',
});

export const ScoreDisplay = styled('div')({
  color: '#f39c12',
  fontSize: 56,
  fontWeight: 900,
  textShadow: '0 0 30px rgba(243, 156, 18, 0.4)',
});

export const StatRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: 'rgba(255,255,255,0.8)',
  fontSize: 16,
  fontWeight: 600,
});

export const ContinueButton = styled('button')({
  background: 'linear-gradient(135deg, #8B2FC9 0%, #6c5ce7 100%)',
  color: '#fff',
  fontSize: 18,
  fontWeight: 700,
  padding: '14px 40px',
  borderRadius: 30,
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 4px 20px rgba(139, 47, 201, 0.4)',
  marginTop: 8,
  '&:active': { transform: 'scale(0.96)' },
});
