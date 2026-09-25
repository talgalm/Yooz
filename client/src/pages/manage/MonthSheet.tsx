import { useEffect, useState, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../utils/manageApi';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './time.i18n';
import { useManageTimer } from './TimerContext';
import TimeEntryModal from './TimeEntryModal';
import ConfirmDialog from './ConfirmDialog';
import { TimeEntry, refName, toDateInput } from './manageTypes';
import { formatHours } from './duration';
import { PRIMARY, PRIMARY_LIGHT, BORDER, TEXT_LIGHT } from '../../components/styled';
import {
  Panel, EmptyState, Button, GhostButton, LinkButton, Pill, ErrorNote, Toolbar, MOBILE,
} from './manageUi';

interface MonthDay { date: string; minutes: number; entries: TimeEntry[] }
interface MonthData { month: string; days: MonthDay[]; totalMinutes: number; daysWorked: number }

const Bar = styled('div')({
  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
  padding: '12px 16px', borderBottom: `1px solid ${BORDER}`,
});

const Stat = styled('span')({ fontSize: 13, color: TEXT_LIGHT });
const StatValue = styled('b')({ color: PRIMARY, fontSize: 15 });

const Grid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: 1,
  background: BORDER,
  padding: 1,
});

const HeadCell = styled('div')({
  background: '#faf9fd', padding: '7px 4px', textAlign: 'center',
  fontSize: 12, fontWeight: 600, color: TEXT_LIGHT,
});

const DayCell = styled('button')<{ selected?: boolean; today?: boolean; filler?: boolean }>(
  ({ selected, today, filler }) => ({
    background: filler ? '#fbfbfd' : selected ? PRIMARY_LIGHT : '#fff',
    border: 'none',
    borderTop: today ? `2px solid ${PRIMARY}` : '2px solid transparent',
    outline: selected ? `1px solid ${PRIMARY}` : 'none',
    outlineOffset: -1,
    padding: '8px 6px',
    minHeight: 62,
    cursor: filler ? 'default' : 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    '&:hover': filler ? undefined : { background: selected ? PRIMARY_LIGHT : '#fafaff' },
    [MOBILE]: { minHeight: 50, padding: '6px 2px' },
  }),
);

const DayNum = styled('span')<{ dim?: boolean }>(({ dim }) => ({
  fontSize: 13, fontWeight: 600, color: dim ? '#c9c6d6' : 'inherit',
}));

const DayHours = styled('span')<{ worked?: boolean }>(({ worked }) => ({
  fontSize: 12,
  fontWeight: 700,
  color: worked ? PRIMARY : 'transparent',
  fontVariantNumeric: 'tabular-nums',
}));

const DayPanel = styled('div')({ borderTop: `1px solid ${BORDER}` });
const DayPanelHead = styled('div')({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 8, padding: '11px 16px', background: '#faf9fd', fontSize: 14, fontWeight: 600, flexWrap: 'wrap',
});
const Row = styled('div')({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 16px', fontSize: 14, flexWrap: 'wrap',
  borderBottom: `1px solid ${BORDER}`,
  '&:last-child': { borderBottom: 'none' },
});
const Mins = styled('b')({ fontVariantNumeric: 'tabular-nums', minWidth: 44 });
const What = styled('span')({ flex: 1, minWidth: 120 });
const Note = styled('span')({ color: TEXT_LIGHT, fontSize: 13 });

const MonthInput = styled('input')({
  padding: '8px 10px', fontSize: 14, border: `1px solid ${BORDER}`, borderRadius: 9,
  background: '#fff', fontFamily: 'inherit', colorScheme: 'light',
});

interface Props {
  userId?: string;
  editable?: boolean;
}

export default function MonthSheet({ userId, editable = true }: Props) {
  const t = useTranslations(texts);
  const { version, notify } = useManageTimer();

  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [selected, setSelected] = useState(toDateInput(now.toISOString()));
  const [data, setData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [deleting, setDeleting] = useState<TimeEntry | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const q = userId ? `?userId=${userId}` : '';
      setData(await manageApiFetch<MonthData>(`/api/manage/time/month/${month}${q}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [month, userId]);

  useEffect(() => { load(); }, [load, version]);

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await manageApiFetch(`/api/manage/time/${deleting._id}`, { method: 'DELETE' });
      setDeleting(null);
      notify();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(t.errors[code as keyof typeof t.errors] ?? code);
      setDeleting(null);
    }
  };

  const days = data?.days ?? [];
  const leading = days.length > 0 ? new Date(days[0].date).getDay() : 0;
  const todayKey = toDateInput(new Date().toISOString());
  const selectedDay = days.find((d) => toDateInput(d.date) === selected);

  return (
    <>
      <Toolbar>
        <GhostButton onClick={() => shiftMonth(-1)}>‹</GhostButton>
        <MonthInput type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        <GhostButton onClick={() => shiftMonth(1)}>›</GhostButton>
        {editable && <Button onClick={() => setAdding(selected)}>{t.addEntry}</Button>}
      </Toolbar>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Panel>
        <Bar>
          <Stat>{t.total}: <StatValue>{formatHours(data?.totalMinutes ?? 0)}</StatValue></Stat>
          <Stat>{t.daysWorked}: <StatValue>{data?.daysWorked ?? 0}</StatValue></Stat>
        </Bar>

        {loading ? (
          <EmptyState>{t.loading}</EmptyState>
        ) : (
          <Grid>
            {t.dayShort.map((d) => <HeadCell key={d}>{d}</HeadCell>)}
            {Array.from({ length: leading }, (_, i) => (
              <DayCell key={`pad-${i}`} filler disabled />
            ))}
            {days.map((day) => {
              const key = toDateInput(day.date);
              return (
                <DayCell
                  key={day.date}
                  selected={key === selected}
                  today={key === todayKey}
                  onClick={() => setSelected(key)}
                >
                  <DayNum>{new Date(day.date).getDate()}</DayNum>
                  <DayHours worked={day.minutes > 0}>{formatHours(day.minutes)}</DayHours>
                </DayCell>
              );
            })}
            {Array.from({ length: (7 - ((leading + days.length) % 7)) % 7 }, (_, i) => (
              <DayCell key={`tail-${i}`} filler disabled />
            ))}
          </Grid>
        )}

        <DayPanel>
          <DayPanelHead>
            <span>
              {selectedDay
                ? new Date(selectedDay.date).toLocaleDateString('he-IL', {
                  weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
                })
                : selected}
              {selectedDay && selectedDay.minutes > 0 ? ` · ${formatHours(selectedDay.minutes)}` : ''}
            </span>
            {editable && <LinkButton onClick={() => setAdding(selected)}>+ {t.addEntry}</LinkButton>}
          </DayPanelHead>

          {!selectedDay || selectedDay.entries.length === 0 ? (
            <EmptyState>{t.noEntriesThisDay}</EmptyState>
          ) : (
            selectedDay.entries.map((e) => (
              <Row key={e._id}>
                <Mins>{formatHours(e.minutes)}</Mins>
                <What>
                  {t.categories[e.category]}
                  {refName(e.projectId) ? ` · ${refName(e.projectId)}` : ''}
                  {e.note ? <Note> — {e.note}</Note> : null}
                </What>
                {e.afterProjectClose && <Pill tone="warn">{t.afterClose}</Pill>}
                {e.autoStopped && <Pill tone="warn">{t.autoStopped}</Pill>}
                {e.locked && <Pill tone="muted">{t.locked}</Pill>}
                {editable && !e.locked && (
                  <>
                    <LinkButton onClick={() => setEditing(e)}>{t.editEntry}</LinkButton>
                    <LinkButton onClick={() => setDeleting(e)}>{t.delete}</LinkButton>
                  </>
                )}
              </Row>
            ))
          )}
        </DayPanel>
      </Panel>

      {adding && (
        <TimeEntryModal
          defaultDate={adding}
          onClose={() => setAdding(null)}
          onSaved={() => { setAdding(null); notify(); }}
        />
      )}
      {editing && (
        <TimeEntryModal
          entry={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); notify(); }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t.delete}
          message={t.confirmDelete}
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </>
  );
}
