import { FormEvent, useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
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

interface TodayGroup {
  name: string;
  inviteToken: string;
}

const TodayGroupsTitle = styled('p')({
  margin: '12px 0 6px',
  fontSize: 13,
  fontWeight: 700,
  color: '#666',
  textAlign: 'center',
});

const TodayGroupsList = styled('div')({
  maxHeight: 200,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  border: '1px solid #e0e0e0',
  borderRadius: 12,
  padding: 8,
  WebkitOverflowScrolling: 'touch',
});

const TodayGroupItem = styled('button')({
  padding: '10px 12px',
  background: '#f7f5fb',
  border: '1px solid #e6e0f0',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  color: '#333',
  cursor: 'pointer',
  textAlign: 'start',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '&:hover': { background: '#efe9f8' },
  '&:disabled': { opacity: 0.6, cursor: 'default' },
});

export default function JoinExistingGroupForm({ activityCode, onBack, onTokenResolved }: Props) {
  const t = useTranslations(texts);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [todayGroups, setTodayGroups] = useState<TodayGroup[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/activities/${encodeURIComponent(activityCode)}/groups/today`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((d: { groups?: TodayGroup[] } | null) => setTodayGroups(d?.groups || []))
      .catch(() => {});
    return () => controller.abort();
  }, [activityCode]);

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

      {todayGroups.length > 0 && (() => {
        // Typing in the search box filters the list live.
        const q = input.trim().toLowerCase();
        const filtered = q
          ? todayGroups.filter((g) => g.name.toLowerCase().includes(q))
          : todayGroups;
        return (
          <>
            <TodayGroupsTitle>{t.todayGroupsTitle}</TodayGroupsTitle>
            <TodayGroupsList>
              {filtered.length === 0 ? (
                <TodayGroupItem type="button" disabled>{t.groupNotFound}</TodayGroupItem>
              ) : (
                filtered.map((g) => (
                  <TodayGroupItem
                    key={g.inviteToken}
                    type="button"
                    disabled={loading}
                    onClick={() => onTokenResolved(g.inviteToken)}
                  >
                    {g.name}
                  </TodayGroupItem>
                ))
              )}
            </TodayGroupsList>
          </>
        );
      })()}
      <GroupEntryBackButton onBack={onBack} />
    </GroupEntryForm>
  );
}
