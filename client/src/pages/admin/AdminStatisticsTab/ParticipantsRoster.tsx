import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from '../../../context/LanguageContext';
import { useParticipantsRoster, saveExclusions } from '../../../hooks/useAnalytics';
import { texts } from './AdminStatisticsTab.i18n';
import {
  EmptyState,
  FullPanel,
  PanelTitle,
  ParticipantTable,
  PassGradePreset,
  RosterActions,
  RosterCheckbox,
  RosterSearchInput,
  RosterToolbar,
  ValueBadge,
} from './styled';
import type { RosterParticipant } from './types';

interface Props {
  activityId: string | null;
  /** Called after exclusions are persisted so the dashboard panels can refetch. */
  onExclusionsChanged?: () => void;
}

function template(text: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    text,
  );
}

function statusTone(status: RosterParticipant['status']): 'green' | 'blue' | 'amber' {
  if (status === 'completed') return 'green';
  if (status === 'in_progress') return 'blue';
  return 'amber';
}

export default function ParticipantsRoster({ activityId, onExclusionsChanged }: Props) {
  const t = useTranslations(texts);
  const { data: roster, loading } = useParticipantsRoster(activityId);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Seed the local exclusion set from the server roster (and re-seed on refetch).
  useEffect(() => {
    if (roster) setExcluded(new Set(roster.filter((p) => p.excluded).map((p) => p._id)));
  }, [roster]);

  // Save immediately and optimistically: only the local checkbox state changes —
  // the roster itself never reloads. Reverts if the save fails. The dashboard
  // panels are refreshed lazily by the parent when next viewed, not on each click.
  const commit = (next: Set<string>, previous: Set<string>) => {
    if (!activityId) return;
    setExcluded(next);
    saveExclusions(activityId, [...next])
      .then(() => onExclusionsChanged?.())
      .catch(() => {
        setError(t.exclusionSaveFailed);
        setExcluded(previous);
      });
  };

  const toggle = (id: string) => {
    setError(null);
    const next = new Set(excluded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    commit(next, excluded);
  };

  const includeAll = () => {
    setError(null);
    commit(new Set<string>(), excluded);
  };

  const statusLabel = (status: RosterParticipant['status']) =>
    status === 'completed' ? t.completedLabel : status === 'in_progress' ? t.inProgress : t.joinedOnly;

  const formatDate = (value: string) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
  };

  const filtered = useMemo(() => {
    if (!roster) return [];
    const query = search.trim().toLowerCase();
    if (!query) return roster;
    return roster.filter(
      (p) => (p.name || '').toLowerCase().includes(query) || (p.group || '').toLowerCase().includes(query),
    );
  }, [roster, search]);

  if (loading && !roster) return <EmptyState>{t.loading}</EmptyState>;
  if (!roster || roster.length === 0) return <EmptyState>{t.noParticipants}</EmptyState>;

  const excludedCount = excluded.size;

  return (
    <FullPanel>
      <RosterToolbar>
        <PanelTitle style={{ margin: 0 }}>{t.participantsTab}</PanelTitle>
        <RosterActions>
          <ValueBadge tone={excludedCount > 0 ? 'amber' : 'neutral'}>
            {template(t.excludedCount, { count: excludedCount })}
          </ValueBadge>
          <PassGradePreset type="button" onClick={includeAll} disabled={excludedCount === 0}>
            {t.includeAll}
          </PassGradePreset>
        </RosterActions>
      </RosterToolbar>

      <div style={{ fontSize: 12, color: '#697586', lineHeight: 1.5, marginBottom: 12 }}>{t.excludeHint}</div>

      <RosterSearchInput
        placeholder={t.searchParticipants}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <div style={{ color: '#e74c3c', fontSize: 13, margin: '10px 0 0' }}>{error}</div>}

      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <ParticipantTable>
          <thead>
            <tr>
              <th>{t.included}</th>
              <th>{t.participant}</th>
              <th>{t.group}</th>
              <th>{t.statusHeader}</th>
              <th>{t.score}</th>
              <th>{t.joined}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const isExcluded = excluded.has(p._id);
              return (
                <tr key={p._id} style={{ opacity: isExcluded ? 0.45 : 1 }}>
                  <td>
                    <RosterCheckbox
                      type="checkbox"
                      checked={!isExcluded}
                      onChange={() => toggle(p._id)}
                      aria-label={t.excludeFromStats}
                    />
                  </td>
                  <td style={{ fontWeight: 700, textDecoration: isExcluded ? 'line-through' : 'none' }}>
                    {p.name || '-'}
                  </td>
                  <td>{p.group || '-'}</td>
                  <td>
                    <ValueBadge tone={statusTone(p.status)}>{statusLabel(p.status)}</ValueBadge>
                  </td>
                  <td>{Math.round(p.score)}</td>
                  <td>{formatDate(p.joinedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </ParticipantTable>
      </div>
    </FullPanel>
  );
}
