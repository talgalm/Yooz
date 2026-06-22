import { FormEvent, useState } from 'react';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './groupEntry.i18n';
import {
  GroupEntryButton,
  GroupEntryError,
  GroupEntryForm,
  GroupEntryInput,
  GroupEntrySubtitle,
  TeamNameBadge,
} from './styled';
import { GroupEntryBackButton } from './GroupEntryChoice';
import SmsConsent from '../SmsConsent';

type LoginField = 'email' | 'phoneNumber' | 'name';

interface Props {
  groupName: string;
  groupToken: string;
  loginFields: LoginField[];
  onBack?: () => void;
  onLogin: (data: {
    participantName?: string;
    phoneNumber?: string;
    email?: string;
    groupToken: string;
  }) => Promise<void>;
  onSuccess: () => void;
}

export default function JoinGroupLogin({
  groupName,
  groupToken,
  loginFields,
  onBack,
  onLogin,
  onSuccess,
}: Props) {
  const t = useTranslations(texts);
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);

  const hasName = loginFields.includes('name');
  const hasPhone = loginFields.includes('phoneNumber');
  const hasEmail = loginFields.includes('email');

  const canSubmit =
    !loading &&
    (!hasName || name.length > 0) &&
    (!hasPhone || (phoneNumber.length > 0 && smsConsent)) &&
    (!hasEmail || email.length > 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin({
        ...(hasName && { participantName: name }),
        ...(hasPhone && { phoneNumber }),
        ...(hasEmail && { email }),
        groupToken,
      });
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg === 'not_portal_user' ? t.notPortalUser : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GroupEntryForm onSubmit={handleSubmit}>
      <GroupEntrySubtitle style={{ margin: '0 0 12px' }}>{t.joiningTeam}</GroupEntrySubtitle>
      <TeamNameBadge>{groupName}</TeamNameBadge>

      {hasName && (
        <GroupEntryInput
          placeholder={t.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
      )}
      {hasEmail && (
        <GroupEntryInput
          type="email"
          placeholder={t.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      )}
      {hasPhone && (
        <GroupEntryInput
          type="tel"
          placeholder={t.phoneNumber}
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />
      )}

      {hasPhone && <SmsConsent checked={smsConsent} onChange={setSmsConsent} />}

      {error && <GroupEntryError>{error}</GroupEntryError>}

      <GroupEntryButton type="submit" disabled={!canSubmit}>
        {loading ? t.joining : t.join}
      </GroupEntryButton>
      {onBack && <GroupEntryBackButton onBack={onBack} />}
    </GroupEntryForm>
  );
}
