import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useManageAuth } from '../../../context/ManageAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManageLoginPage.i18n';
import { CenteredPage, Card, Subtitle, Form, Input, PrimaryButton, ErrorText, PRIMARY } from '../../../components/styled';

const Brand = styled('h1')({
  margin: 0,
  fontSize: 28,
  fontWeight: 700,
  color: PRIMARY,
  textAlign: 'center',
});

export default function ManageLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mustChange, setMustChange] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useManageAuth();
  const navigate = useNavigate();
  const t = useTranslations(texts);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (mustChange && newPassword !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }
    setLoading(true);
    try {
      await login(email, password, mustChange ? newPassword : undefined);
      navigate('/manage/my-work');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'must_change_password') setMustChange(true);
      setError(t.errors[msg as keyof typeof t.errors] ?? (msg || t.failed));
    } finally {
      setLoading(false);
    }
  };

  return (
    <CenteredPage>
      <Card>
        <Brand>{t.title}</Brand>
        <Subtitle>{t.subtitle}</Subtitle>
        <Form onSubmit={handleSubmit}>
          <Input
            type="email"
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            type="password"
            placeholder={t.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {mustChange && (
            <>
              <Input
                type="password"
                placeholder={t.newPassword}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <Input
                type="password"
                placeholder={t.confirmPassword}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </>
          )}
          {error && <ErrorText>{error}</ErrorText>}
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? t.submitting : t.submit}
          </PrimaryButton>
        </Form>
      </Card>
    </CenteredPage>
  );
}
