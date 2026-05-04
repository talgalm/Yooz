import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useManagerAuth } from '../../../context/ManagerAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManagerLoginPage.i18n';
import {
  AdminPage,
  AdminHeader,
  AdminContent,
  Form,
  Input,
  PrimaryButton,
  ErrorText,
} from '../../../components/styled';
import {
  AdminCardCentered,
  CenteredTitle,
  CenteredSubtitle,
} from '../../admin/styled';

export default function ManagerLoginPage() {
  const [activityCode, setActivityCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useManagerAuth();
  const navigate = useNavigate();
  const t = useTranslations(texts);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(activityCode.trim(), email.trim(), password);
      navigate('/manager/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
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
          <CenteredSubtitle>{t.subtitle}</CenteredSubtitle>
          <Form onSubmit={handleSubmit}>
            <Input
              placeholder={t.activityCode}
              value={activityCode}
              onChange={(e) => setActivityCode(e.target.value)}
              required
            />
            <Input
              type="email"
              placeholder={t.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            <PrimaryButton type="submit" disabled={loading || !activityCode.trim() || !email.trim() || !password}>
              {loading ? t.loggingIn : t.login}
            </PrimaryButton>
          </Form>
        </AdminCardCentered>
      </AdminContent>
    </AdminPage>
  );
}
