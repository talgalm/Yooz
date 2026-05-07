import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useManagerAuth } from '../../context/ManagerAuthContext';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './ManagerLoginModal.i18n';
import { isGoogleAuthAvailable, openGooglePopup } from '../../utils/googleAuth';

interface Props {
  activityCode: string;
  requiresPassword: boolean;
  onClose: () => void;
}

const Backdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  padding: 16,
  backdropFilter: 'blur(2px)',
});

const Dialog = styled('div')({
  width: '100%',
  maxWidth: 380,
  background: '#fff',
  borderRadius: 18,
  padding: '24px 22px 22px',
  boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
  position: 'relative',
});

const Title = styled('h2')({
  margin: '0 0 4px',
  fontSize: 20,
  fontWeight: 800,
  color: '#222',
  textAlign: 'center',
});

const Subtitle = styled('p')({
  margin: '0 0 20px',
  fontSize: 14,
  color: '#666',
  textAlign: 'center',
});

const Form = styled('form')({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
});

const Input = styled('input')({
  width: '100%',
  padding: '14px 16px',
  fontSize: 16,
  border: '1px solid #ddd',
  borderRadius: 10,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  background: '#f7f7f9',
  '&:focus': { borderColor: '#8B2FC9', background: '#fff' },
});

const PrimaryBtn = styled('button')({
  width: '100%',
  padding: 14,
  fontSize: 16,
  fontWeight: 700,
  color: '#fff',
  background: '#8B2FC9',
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
});

const GoogleBtn = styled('button')({
  width: '100%',
  padding: 13,
  fontSize: 15,
  fontWeight: 600,
  color: '#333',
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 10,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  '&:disabled': { opacity: 0.6, cursor: 'not-allowed' },
});

const ErrorText = styled('p')({
  color: '#d32f2f',
  fontSize: 13,
  margin: 0,
  textAlign: 'center',
});

const CloseBtn = styled('button')({
  position: 'absolute',
  top: 8,
  insetInlineEnd: 8,
  width: 32,
  height: 32,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 22,
  color: '#888',
  fontFamily: 'inherit',
  lineHeight: 1,
  '&:hover': { color: '#222' },
});

export default function ManagerLoginModal({ activityCode, requiresPassword, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useManagerAuth();
  const navigate = useNavigate();
  const t = useTranslations(texts);

  const showGoogle = isGoogleAuthAvailable();
  const passwordOnly = requiresPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ activityCode, email: email.trim(), password });
      navigate('/manager/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setError('');
    setLoading(true);
    try {
      const accessToken = await openGooglePopup();
      await login({ activityCode, googleAccessToken: accessToken });
      navigate('/manager/dashboard');
    } catch (err) {
      if (err instanceof Error && err.message !== 'Popup closed') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Backdrop onClick={onClose}>
      <Dialog onClick={(e) => e.stopPropagation()}>
        <CloseBtn type="button" aria-label={t.close} onClick={onClose}>×</CloseBtn>
        <Title>{t.title}</Title>
        <Subtitle>{t.subtitle}</Subtitle>

        {passwordOnly ? (
          <Form onSubmit={handleSubmit}>
            <Input
              type="email"
              placeholder={t.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
            <Input
              type="password"
              placeholder={t.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <ErrorText>{error}</ErrorText>}
            <PrimaryBtn type="submit" disabled={loading || !email.trim() || !password}>
              {loading ? t.loggingIn : t.login}
            </PrimaryBtn>
          </Form>
        ) : showGoogle ? (
          <>
            <GoogleBtn type="button" onClick={handleGoogleClick} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              {loading ? t.loggingIn : t.googleSignIn}
            </GoogleBtn>
            {error && <ErrorText style={{ marginTop: 12 }}>{error}</ErrorText>}
          </>
        ) : (
          <ErrorText>{t.googleUnavailable}</ErrorText>
        )}
      </Dialog>
    </Backdrop>
  );
}
