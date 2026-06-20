import { useEffect, useState } from 'react';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './groupEntry.i18n';
import {
  GroupEntryButton,
  GroupEntrySubtitle,
  GroupEntryTitle,
  InviteLinkBox,
  TeamNameBadge,
  GroupEntryHint,
} from './styled';

interface GroupStatus {
  memberCount: number;
  minMembers: number;
  canProceed: boolean;
}

interface Props {
  activityCode: string;
  groupName: string;
  inviteUrl: string;
  onContinue: () => void;
}

export default function GroupCreatedSuccess({ activityCode, groupName, inviteUrl, onContinue }: Props) {
  const t = useTranslations(texts);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<GroupStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const token = localStorage.getItem('yooz_token');
        const res = await fetch(`/api/activities/${encodeURIComponent(activityCode)}/groups/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok || cancelled) return;
        const data = await res.json() as GroupStatus;
        if (!cancelled) setStatus(data);
      } catch {
        /* ignore poll errors */
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activityCode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('textarea');
      input.value = inviteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canContinue = status?.canProceed ?? false;
  const waitingText = status
    ? t.waitingForTeammates
        .replace('{count}', String(status.memberCount))
        .replace('{min}', String(status.minMembers))
    : t.checkingTeamStatus;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 12 }}>
      <GroupEntryTitle>{t.teamCreated}</GroupEntryTitle>
      <GroupEntrySubtitle>{t.teamCreatedSub}</GroupEntrySubtitle>
      <TeamNameBadge>{groupName}</TeamNameBadge>
      <InviteLinkBox>{inviteUrl}</InviteLinkBox>
      <GroupEntryButton type="button" onClick={handleCopy}>
        {copied ? t.copied : t.copyLink}
      </GroupEntryButton>
      {!canContinue && (
        <GroupEntryHint status="neutral">{waitingText}</GroupEntryHint>
      )}
      <GroupEntryButton
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        style={{ marginTop: 4, opacity: canContinue ? 1 : 0.5 }}
      >
        {canContinue ? t.continueToGame : t.waitingToStart}
      </GroupEntryButton>
    </div>
  );
}
