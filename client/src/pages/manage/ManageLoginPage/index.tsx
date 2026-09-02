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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useManageAuth();
  const navigate = useNavigate();
  const t = useTranslations(texts);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/manage/my-work');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
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
          {error && <ErrorText>{error}</ErrorText>}
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? t.submitting : t.submit}
          </PrimaryButton>
        </Form>
      </Card>
    </CenteredPage>
  );
}
