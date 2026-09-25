import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { manageApiFetch } from '../../utils/manageApi';
import { useManageAuth } from '../../context/ManageAuthContext';
import { TimeEntry, TimeCategory } from './manageTypes';

interface TimerContextType {
  timer: TimeEntry | null;
  elapsedMinutes: number;
  version: number;
  start: (input: { category: TimeCategory; projectId?: string; note?: string }) => Promise<void>;
  stop: () => Promise<void>;
  refresh: () => Promise<void>;
  notify: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

export function ManageTimerProvider({ children }: { children: ReactNode }) {
  const { user, isManageAuthenticated } = useManageAuth();
  const [timer, setTimer] = useState<TimeEntry | null>(null);
  const [now, setNow] = useState(Date.now());
  const [version, setVersion] = useState(0);

  const tracksTime = !!user?.tracksTime;

  const refresh = useCallback(async () => {
    if (!isManageAuthenticated || !tracksTime) { setTimer(null); return; }
    try {
      const r = await manageApiFetch<{ timer: TimeEntry | null }>('/api/manage/time/timer');
      setTimer(r.timer);
    } catch {
      setTimer(null);
    }
  }, [isManageAuthenticated, tracksTime]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const notify = useCallback(() => setVersion((v) => v + 1), []);

  const start: TimerContextType['start'] = async (input) => {
    const r = await manageApiFetch<{ timer: TimeEntry }>('/api/manage/time/timer/start', {
      method: 'POST', body: JSON.stringify(input),
    });
    setTimer(r.timer);
    notify();
  };

  const stop = async () => {
    await manageApiFetch('/api/manage/time/timer/stop', { method: 'POST' });
    setTimer(null);
    notify();
  };

  const elapsedMinutes = timer?.startedAt
    ? Math.max(0, Math.floor((now - new Date(timer.startedAt).getTime()) / 60_000))
    : 0;

  return (
    <TimerContext.Provider value={{ timer, elapsedMinutes, version, start, stop, refresh, notify }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useManageTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useManageTimer must be used within ManageTimerProvider');
  return ctx;
}
