import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManageCalendarPage.i18n';
import { CalendarEvent, CALENDAR_COLORS, Task, toDateInput } from '../manageTypes';
import { PRIMARY, PRIMARY_LIGHT, BORDER, TEXT_LIGHT } from '../../../components/styled';
import {
  PageHeader, SectionTitle, Panel, EmptyState, ErrorNote, Toolbar, Button, GhostButton, MOBILE,
} from '../manageUi';
import TaskModal from '../TaskModal';

const MonthInput = styled('input')({
  padding: '8px 10px', fontSize: 14, border: `1px solid ${BORDER}`, borderRadius: 9,
  background: '#fff', fontFamily: 'inherit', colorScheme: 'light',
});

const Grid = styled('div')({
  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: BORDER, padding: 1,
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
    padding: '7px 5px',
    minHeight: 66,
    cursor: filler ? 'default' : 'pointer',
    fontFamily: 'inherit',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    '&:hover': filler ? undefined : { background: selected ? PRIMARY_LIGHT : '#fafaff' },
    [MOBILE]: { minHeight: 54 },
  }),
);
const DayNum = styled('span')({ fontSize: 13, fontWeight: 600 });
const Dots = styled('div')({ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' });
const Dot = styled('span')<{ tone: string }>(({ tone }) => ({
  width: 6, height: 6, borderRadius: '50%', background: tone,
}));

const DayPanel = styled('div')({ borderTop: `1px solid ${BORDER}` });
const DayHead = styled('div')({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '9px 16px', background: '#faf9fd', fontSize: 14, fontWeight: 600,
});
const EventRow = styled('button')<{ tone: string }>(({ tone }) => ({
  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
  padding: '10px 16px', borderBottom: `1px solid ${BORDER}`,
  borderTop: 'none', borderInline: 'none', background: 'none',
  textAlign: 'start', cursor: 'pointer', fontFamily: 'inherit',
  color: 'inherit', fontSize: 14,
  '&:last-child': { borderBottom: 'none' },
  '&:hover': { background: '#fafaff' },
  '&::before': {
    content: '""', width: 8, height: 8, borderRadius: '50%', background: tone, flexShrink: 0,
  },
}));
const Kind = styled('span')({ fontSize: 12.5, color: TEXT_LIGHT, marginInlineStart: 'auto', whiteSpace: 'nowrap' });

const Legend = styled('div')({
  display: 'flex', gap: 14, flexWrap: 'wrap', padding: '10px 16px',
  fontSize: 12.5, color: TEXT_LIGHT, borderTop: `1px solid ${BORDER}`,
});
const LegendItem = styled('span')({ display: 'flex', alignItems: 'center', gap: 6 });

export default function ManageCalendarPage() {
  const t = useTranslations(texts);
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [selected, setSelected] = useState(toDateInput(now.toISOString()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setError('');
    const [y, m] = month.split('-').map(Number);
    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 0);
    try {
      const r = await manageApiFetch<{ events: CalendarEvent[] }>(
        `/api/manage/calendar?from=${toDateInput(from.toISOString())}&to=${toDateInput(to.toISOString())}`,
      );
      setEvents(r.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const openEvent = async (e: CalendarEvent) => {
    if (e.kind !== 'task_due') { navigate(e.href); return; }
    try {
      const r = await manageApiFetch<{ task: Task }>(`/api/manage/tasks/${e.entityId}`);
      setEditing(r.task);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const leading = new Date(y, m - 1, 1).getDay();
  const todayKey = toDateInput(new Date().toISOString());

  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = toDateInput(e.date);
    byDay.set(key, [...(byDay.get(key) ?? []), e]);
  }
  const selectedEvents = byDay.get(selected) ?? [];

  return (
    <>
      <PageHeader>
        <SectionTitle>{t.title}</SectionTitle>
      </PageHeader>

      <Toolbar>
        <GhostButton onClick={() => shiftMonth(-1)}>‹</GhostButton>
        <MonthInput type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        <GhostButton onClick={() => shiftMonth(1)}>›</GhostButton>
      </Toolbar>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Panel>
        {loading ? (
          <EmptyState>{t.loading}</EmptyState>
        ) : (
          <Grid>
            {t.dayShort.map((d) => <HeadCell key={d}>{d}</HeadCell>)}
            {Array.from({ length: leading }, (_, i) => <DayCell key={`pad-${i}`} filler disabled />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const date = new Date(y, m - 1, i + 1);
              const key = toDateInput(date.toISOString());
              const dayEvents = byDay.get(key) ?? [];
              return (
                <DayCell
                  key={key}
                  selected={key === selected}
                  today={key === todayKey}
                  onClick={() => setSelected(key)}
                >
                  <DayNum>{i + 1}</DayNum>
                  <Dots>
                    {dayEvents.slice(0, 4).map((e, n) => (
                      <Dot key={n} tone={e.color ?? CALENDAR_COLORS[e.kind]} title={e.title} />
                    ))}
                    {dayEvents.length > 4 && <span style={{ fontSize: 10, color: TEXT_LIGHT }}>+{dayEvents.length - 4}</span>}
                  </Dots>
                </DayCell>
              );
            })}
            {Array.from({ length: (7 - ((leading + daysInMonth) % 7)) % 7 }, (_, i) => (
              <DayCell key={`tail-${i}`} filler disabled />
            ))}
          </Grid>
        )}

        <DayPanel>
          <DayHead>
            {new Date(selected).toLocaleDateString('he-IL', {
              weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
            })}
            {selectedEvents.length > 0 && (
              <GhostButton style={{ marginInlineStart: 'auto' }} onClick={() => setCreating(true)}>
                {t.addTaskThisDay}
              </GhostButton>
            )}
          </DayHead>
          {selectedEvents.length === 0 ? (
            <EmptyState>
              <div>{t.nothingOnThisDay}</div>
              <Button style={{ marginTop: 12 }} onClick={() => setCreating(true)}>{t.addTaskThisDay}</Button>
            </EmptyState>
          ) : (
            selectedEvents.map((e, i) => (
              <EventRow
                key={`${e.entityId}-${e.kind}-${i}`}
                type="button"
                onClick={() => openEvent(e)}
                tone={e.color ?? CALENDAR_COLORS[e.kind]}
              >
                <span>{e.title}</span>
                <Kind>{t.kinds[e.kind]}</Kind>
              </EventRow>
            ))
          )}
        </DayPanel>

        <Legend>
          {(Object.keys(CALENDAR_COLORS) as (keyof typeof CALENDAR_COLORS)[]).map((k) => (
            <LegendItem key={k}><Dot tone={CALENDAR_COLORS[k]} />{t.kinds[k]}</LegendItem>
          ))}
        </Legend>
      </Panel>

      <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 12 }}>{t.readOnlyNote}</div>

      {(creating || editing) && (
        <TaskModal
          task={editing ?? undefined}
          defaultDueDate={selected}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}
    </>
  );
}
