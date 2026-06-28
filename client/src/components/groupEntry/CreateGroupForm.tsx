import { FormEvent, useState } from 'react';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './groupEntry.i18n';
import {
  GroupEntryButton,
  GroupEntryError,
  GroupEntryForm,
  GroupEntryHint,
  GroupEntryInput,
} from './styled';
import { GroupEntryBackButton } from './GroupEntryChoice';
import { useDebouncedGroupNameCheck } from './useDebouncedGroupNameCheck';
import SmsConsent from '../SmsConsent';

type LoginField = 'email' | 'phoneNumber' | 'name';

interface Props {
  activityCode: string;
  loginFields: LoginField[];
  onBack: () => void;
  onCreated: (result: {
    groupName: string;
    inviteUrl: string;
    token: string;
  }) => void;
  onEstablishSession: (token: string) => void;
}

export default function CreateGroupForm({
  activityCode,
  loginFields,
  onBack,
  onCreated,
  onEstablishSession,
}: Props) {
  const t = useTranslations(texts);
  const [groupName, setGroupName] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const nameStatus = useDebouncedGroupNameCheck(activityCode, groupName);
  const hasName = loginFields.includes('name');
  const hasPhone = loginFields.includes('phoneNumber');
  const hasEmail = loginFields.includes('email');

  const canSubmit =
    !loading &&
    groupName.trim().length >= 2 &&
    nameStatus === 'available' &&
    (!hasName || name.length > 0) &&
    (!hasPhone || (phoneNumber.length > 0 && smsConsent)) &&
    (!hasEmail || email.length > 0);

  const hintText =
    nameStatus === 'checking' ? t.checkingName
    : nameStatus === 'available' ? t.nameAvailable
    : nameStatus === 'taken' ? t.nameTaken
    : nameStatus === 'invalid' && groupName.trim().length > 0 ? t.nameInvalid
    : '';

  const hintStatus =
    nameStatus === 'available' ? 'ok'
    : nameStatus === 'taken' || nameStatus === 'invalid' ? 'error'
    : 'neutral';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/activities/${encodeURIComponent(activityCode)}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName.trim(),
          ...(hasName && { participantName: name }),
          ...(hasPhone && { phoneNumber }),
          ...(hasEmail && { email }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create group');
      }
      onEstablishSession(data.token);
      // Use the current browser origin so dev links work on :5173 (server returns :3000).
      const inviteUrl = `${window.location.origin}/play/${activityCode}/join/${data.group.inviteToken}`;
      onCreated({
        groupName: data.group.name,
        inviteUrl,
        token: data.token,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GroupEntryForm onSubmit={handleSubmit}>
      <GroupEntryInput
        placeholder={t.groupName}
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        required
        autoFocus
      />
      {hintText && <GroupEntryHint status={hintStatus}>{hintText}</GroupEntryHint>}

      {hasName && (
        <GroupEntryInput
          placeholder={t.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
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
        {loading ? t.creating : t.createTeam}
      </GroupEntryButton>
      <GroupEntryBackButton onBack={onBack} />
    </GroupEntryForm>
  );
}
