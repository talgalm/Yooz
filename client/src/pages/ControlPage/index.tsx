import { useState, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './ControlPage.i18n';
import {
  AdminPage,
  AdminHeader,
  AdminContent,
  Form,
  Input,
  PrimaryButton,
  ErrorText,
} from '../../components/styled';
import {
  AdminCardCentered,
  CenteredTitle,
  CenteredSubtitle,
} from '../admin/styled';

const SuccessText = styled('p')({
  color: '#2e7d32',
  fontSize: 14,
  margin: 0,
  textAlign: 'center',
});

const USERNAME = 'register';
const PASSWORD = '123456';

export default function ControlPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations(texts);
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (username.trim() === USERNAME && password === PASSWORD) {
      setAuthed(true);
      setError('');
    } else {
      setError(t.badCredentials);
    }
  };

  const handleEnter = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved('');
    setSaving(true);
    try {
      const res = await fetch(`/api/activities/control/${id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      if (!res.ok) throw new Error(t.registerFailed);
      setSaved(t.registered.replace('{phone}', phone.trim()));
      setPhone('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.registerFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage>
      <AdminHeader>
        <img src="/images/logo-purple.png" alt="Yooz" style={{ height: 32 }} />
      </AdminHeader>
      <AdminContent>
        <AdminCardCentered>
          <CenteredTitle>{t.title}</CenteredTitle>
          {!authed ? (
            <>
              <CenteredSubtitle>{t.subtitle}</CenteredSubtitle>
              <Form onSubmit={handleLogin}>
                <Input
                  placeholder={t.username}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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
                <PrimaryButton type="submit" disabled={!username.trim() || !password}>
                  {t.login}
                </PrimaryButton>
              </Form>
            </>
          ) : (
            <Form onSubmit={handleEnter}>
              <Input
                type="tel"
                placeholder={t.phone}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoFocus
              />
              {error && <ErrorText>{error}</ErrorText>}
              {saved && <SuccessText>{saved}</SuccessText>}
              <PrimaryButton type="submit" disabled={saving || !phone.trim()}>
                {t.enter}
              </PrimaryButton>
            </Form>
          )}
        </AdminCardCentered>
      </AdminContent>
    </AdminPage>
  );
}
