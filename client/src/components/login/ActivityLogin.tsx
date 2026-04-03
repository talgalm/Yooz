import { useState, useRef, FormEvent } from 'react';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './ActivityLogin.i18n';
import GroupSelector from './GroupSelector';
import { Form } from '../styled';
import { styled } from '@mui/material/styles';
import { isGoogleAuthAvailable, openGooglePopup, fetchGoogleEmail } from '../../utils/googleAuth';

type LoginField = 'email' | 'phoneNumber' | 'name';
type ConnectionType = 'single' | 'group';

interface GroupConfig {
  name: string;
}

interface LoginData {
  activityCode: string;
  participantName?: string;
  email?: string;
  phoneNumber?: string;
  group?: string;
}

interface Props {
  activityCode: string;
  loginFields: LoginField[];
  emailGoogle?: boolean;
  connectionType: ConnectionType;
  groups: GroupConfig[];
  onSuccess: () => void;
  onLogin: (data: LoginData) => Promise<void>;
}

// ─── Styled for purple login page ───

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
  '&::placeholder': {
    color: '#aaa',
  },
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
  '&:active': {
    transform: 'scale(0.98)',
  },
  '&:disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

const LoginGoogleButton = styled('button')({
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
  '&:active': {
    transform: 'scale(0.98)',
  },
  '&:disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
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

const LoginErrorText = styled('p')({
  color: '#ffcdd2',
  fontSize: 14,
  margin: 0,
  textAlign: 'center',
});

export default function ActivityLogin({
  activityCode,
  loginFields,
  emailGoogle,
  connectionType,
  groups,
  onSuccess,
  onLogin,
}: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const t = useTranslations(texts);

  // Ref for group so Google popup callback can read latest value
  const selectedGroupRef = useRef(selectedGroup);
  selectedGroupRef.current = selectedGroup;
  const nameRef = useRef(name);
  nameRef.current = name;
  const phoneRef = useRef(phoneNumber);
  phoneRef.current = phoneNumber;

  const hasEmail = loginFields.includes('email');
  const hasName = loginFields.includes('name');
  const hasPhone = loginFields.includes('phoneNumber');
  const isGroup = connectionType === 'group';
  const showGoogle = hasEmail && emailGoogle && isGoogleAuthAvailable();

  const canSubmit =
    !loading &&
    (!hasName || name.length > 0) &&
    (!hasEmail || email.length > 0) &&
    (!hasPhone || phoneNumber.length > 0) &&
    (!isGroup || selectedGroup.length > 0);

  const buildLoginData = (overrideEmail?: string): LoginData => ({
    activityCode,
    ...(hasName && { participantName: nameRef.current }),
    ...(hasEmail && { email: overrideEmail || email }),
    ...(hasPhone && { phoneNumber: phoneRef.current }),
    ...(isGroup && { group: selectedGroupRef.current }),
  });

  const handleGoogleClick = async () => {
    setError('');
    setLoading(true);
    try {
      const accessToken = await openGooglePopup();
      const googleEmail = await fetchGoogleEmail(accessToken);
      await onLogin(buildLoginData(googleEmail));
      onSuccess();
    } catch (err) {
      if (err instanceof Error && err.message !== 'Popup closed') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(buildLoginData());
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg === 'not_portal_user' ? t.notPortalUser : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {hasName && (
        <LoginInput
          placeholder={t.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      )}

      {hasEmail && (
        <LoginInput
          type="email"
          placeholder={t.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      )}

      {hasPhone && (
        <LoginInput
          type="tel"
          placeholder={t.phoneNumber}
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />
      )}

      {isGroup && groups.length > 0 && (
        <GroupSelector
          groups={groups}
          value={selectedGroup}
          onChange={setSelectedGroup}
        />
      )}

      {error && <LoginErrorText>{error}</LoginErrorText>}

      <LoginButton type="submit" disabled={!canSubmit}>
        {loading ? t.joining : t.join}
      </LoginButton>



      {showGoogle && (
        <>
          <LoginDivider>{t.or}</LoginDivider>
          <LoginGoogleButton type="button" onClick={handleGoogleClick} disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {t.googleSignIn}
          </LoginGoogleButton>
        </>
      )}
    </Form>
  );
}
