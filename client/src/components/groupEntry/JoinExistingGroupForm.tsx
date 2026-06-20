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
import { extractInviteToken } from './useDebouncedGroupNameCheck';

interface Props {
  activityCode: string;
  onBack: () => void;
  onTokenResolved: (token: string) => void;
}

export default function JoinExistingGroupForm({ activityCode, onBack, onTokenResolved }: Props) {
  const t = useTranslations(texts);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resolveByToken = async (token: string): Promise<boolean> => {
    const res = await fetch(
      `/api/activities/${encodeURIComponent(activityCode)}/groups/by-token/${encodeURIComponent(token)}`,
    );
    if (!res.ok) return false;
    onTokenResolved(token);
    return true;
  };

  const resolveByName = async (name: string): Promise<boolean> => {
    const res = await fetch(
      `/api/activities/${encodeURIComponent(activityCode)}/groups/by-name?name=${encodeURIComponent(name)}`,
    );
    if (!res.ok) return false;
    const data = await res.json() as { inviteToken: string };
    onTokenResolved(data.inviteToken);
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = input.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const token = extractInviteToken(trimmed);
      const looksLikeInvite = !!token || /\/join\//i.test(trimmed) || /^https?:\/\//i.test(trimmed);

      if (token) {
        const ok = await resolveByToken(token);
        if (ok) return;
      }

      if (trimmed.length >= 2 && trimmed.length <= 50) {
        const ok = await resolveByName(trimmed);
        if (ok) return;
      }

      setError(looksLikeInvite ? t.invalidLink : t.groupNotFound);
    } catch {
      setError(t.groupNotFound);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GroupEntryForm onSubmit={handleSubmit}>
      <GroupEntryHint status="neutral">{t.joinHelp}</GroupEntryHint>
      <GroupEntryInput
        placeholder={t.joinPlaceholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        required
        autoFocus
      />
      {error && <GroupEntryError>{error}</GroupEntryError>}
      <GroupEntryButton type="submit" disabled={loading || !input.trim()}>
        {loading ? t.joining : t.continue}
      </GroupEntryButton>
      <GroupEntryBackButton onBack={onBack} />
    </GroupEntryForm>
  );
}
