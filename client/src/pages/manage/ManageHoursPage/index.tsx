import { useEffect, useState, useCallback } from 'react';
import { manageApiFetch } from '../../../utils/manageApi';
import { useManageAuth } from '../../../context/ManageAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from '../time.i18n';
import MonthSheet from '../MonthSheet';
import { useManageTimer } from '../TimerContext';
import { Table } from '../../../components/styled';
import {
  TimeEntry, TravelEntry, TeamMember, TIME_CATEGORIES, refName, formatDate, formatMoney,
} from '../manageTypes';
import { formatHours } from '../duration';
import {
  PageHeader, SectionTitle, Panel, TableScroll, Toolbar, SmallSelect,
  Tabs, Tab, Pill, EmptyState, ErrorNote, MOBILE,
} from '../manageUi';
import { styled } from '@mui/material/styles';

const DesktopCell = styled('td')({ [MOBILE]: { display: 'none' } });
const DesktopHead = styled('th')({ [MOBILE]: { display: 'none' } });

export default function ManageHoursPage() {
  const t = useTranslations(texts);
  const { user } = useManageAuth();
  const { version } = useManageTimer();
  const canSeeOthers = user?.role === 'owner' || user?.role === 'pm';

  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [people, setPeople] = useState<TeamMember[]>([]);
  const [personId, setPersonId] = useState('');
  const [category, setCategory] = useState('');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [travel, setTravel] = useState<TravelEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canSeeOthers) return;
    manageApiFetch<{ users: TeamMember[] }>('/api/manage/users')
      .then((r) => setPeople(r.users))
      .catch(() => setPeople([]));
  }, [canSeeOthers]);

  const loadList = useCallback(async () => {
    if (view !== 'list') return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (personId) params.set('userId', personId);
      if (category) params.set('category', category);
      const travelParams = new URLSearchParams(personId ? { userId: personId } : {});
      const [r, tr] = await Promise.all([
        manageApiFetch<{ entries: TimeEntry[] }>(`/api/manage/time?${params}`),
        user?.role === 'owner' || !personId || personId === user?._id
          ? manageApiFetch<{ entries: TravelEntry[] }>(`/api/manage/time/travel?${travelParams}`)
          : Promise.resolve({ entries: [] as TravelEntry[] }),
      ]);
      setEntries(r.entries);
      setTravel(tr.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [view, personId, category, user]);

  useEffect(() => { loadList(); }, [loadList, version]);

  const total = entries.reduce((a, e) => a + e.minutes, 0);
  const travelTotal = travel.reduce((a, e) => a + e.amount, 0);
  const showTravelPerson = user?.role === 'owner';

  return (
    <>
      <PageHeader>
        <SectionTitle>{t.hours}</SectionTitle>
      </PageHeader>

      <Tabs>
        <Tab active={view === 'calendar'} onClick={() => setView('calendar')}>{t.calendarView}</Tab>
        <Tab active={view === 'list'} onClick={() => setView('list')}>{t.listView}</Tab>
      </Tabs>

      {canSeeOthers && (
        <Toolbar>
          <SmallSelect value={personId} onChange={(e) => setPersonId(e.target.value)}>
            <option value="">{view === 'calendar' ? t.person : t.allPeople}</option>
            {people.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </SmallSelect>
          {view === 'list' && (
            <SmallSelect value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">{t.allCategories}</option>
              {TIME_CATEGORIES.map((c) => <option key={c} value={c}>{t.categories[c]}</option>)}
            </SmallSelect>
          )}
        </Toolbar>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      {view === 'calendar' ? (
        <MonthSheet
          key={personId}
          userId={personId || undefined}
          editable={!personId || personId === user?._id}
        />
      ) : (
        <Panel>
          {loading ? (
            <EmptyState>{t.loading}</EmptyState>
          ) : entries.length === 0 ? (
            <EmptyState>{t.noEntries}</EmptyState>
          ) : (
            <TableScroll>
              <Table>
                <thead>
                  <tr>
                    <th>{t.date}</th>
                    <th>{t.duration}</th>
                    <th>{t.category}</th>
                    <DesktopHead>{t.project}</DesktopHead>
                    {canSeeOthers && <DesktopHead>{t.person}</DesktopHead>}
                    <DesktopHead>{t.note}</DesktopHead>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e._id} style={{ cursor: 'default' }}>
                      <td>{formatDate(e.date)}</td>
                      <td><b>{formatHours(e.minutes)}</b></td>
                      <td>
                        {t.categories[e.category]}
                        {e.afterProjectClose && <> <Pill tone="warn">{t.afterClose}</Pill></>}
                      </td>
                      <DesktopCell>{refName(e.projectId) ?? '—'}</DesktopCell>
                      {canSeeOthers && <DesktopCell>{refName(e.userId) ?? '—'}</DesktopCell>}
                      <DesktopCell>{e.note ?? '—'}</DesktopCell>
                    </tr>
                  ))}
                  <tr style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 700, background: '#faf9fd' }}>{t.total}</td>
                    <td style={{ fontWeight: 700, background: '#faf9fd' }}>{formatHours(total)}</td>
                    <td style={{ background: '#faf9fd' }} />
                    <DesktopCell style={{ background: '#faf9fd' }} />
                    {canSeeOthers && <DesktopCell style={{ background: '#faf9fd' }} />}
                    <DesktopCell style={{ background: '#faf9fd' }} />
                  </tr>
                </tbody>
              </Table>
            </TableScroll>
          )}
        </Panel>
      )}

      {view === 'list' && !loading && (
        <Panel style={{ marginTop: 16 }}>
          {travel.length === 0 ? (
            <EmptyState>{t.noTravel}</EmptyState>
          ) : (
            <TableScroll>
              <Table>
                <thead>
                  <tr>
                    <th>{t.date}</th>
                    <th>{t.travel}</th>
                    {showTravelPerson && <DesktopHead>{t.person}</DesktopHead>}
                    <DesktopHead>{t.note}</DesktopHead>
                  </tr>
                </thead>
                <tbody>
                  {travel.map((e) => (
                    <tr key={e._id} style={{ cursor: 'default' }}>
                      <td>{formatDate(e.date)}</td>
                      <td><b>{formatMoney(e.amount)}</b></td>
                      {showTravelPerson && <DesktopCell>{refName(e.userId) ?? '—'}</DesktopCell>}
                      <DesktopCell>{e.note ?? '—'}</DesktopCell>
                    </tr>
                  ))}
                  <tr style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 700, background: '#faf9fd' }}>{t.total}</td>
                    <td style={{ fontWeight: 700, background: '#faf9fd' }}>{formatMoney(travelTotal)}</td>
                    {showTravelPerson && <DesktopCell style={{ background: '#faf9fd' }} />}
                    <DesktopCell style={{ background: '#faf9fd' }} />
                  </tr>
                </tbody>
              </Table>
            </TableScroll>
          )}
        </Panel>
      )}
    </>
  );
}
