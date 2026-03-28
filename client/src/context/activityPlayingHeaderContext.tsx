import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

export type ActivityGameHeaderPhase = 'intro' | 'playing' | 'finish';

export interface ActivityGameHeaderSlot {
  phase: ActivityGameHeaderPhase;
  toggleMute: () => void;
  isMuted: boolean;
}

const ActivityPlayingHeaderSlotContext = createContext<ActivityGameHeaderSlot | null>(null);
const ActivityPlayingHeaderSetSlotContext = createContext<
  Dispatch<SetStateAction<ActivityGameHeaderSlot | null>> | null
>(null);

/** Wrap playing-phase layout so games can register music / phase for the sticky header. */
export function ActivityPlayingHeaderProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<ActivityGameHeaderSlot | null>(null);
  return (
    <ActivityPlayingHeaderSetSlotContext.Provider value={setSlot}>
      <ActivityPlayingHeaderSlotContext.Provider value={slot}>
        {children}
      </ActivityPlayingHeaderSlotContext.Provider>
    </ActivityPlayingHeaderSetSlotContext.Provider>
  );
}

export function useActivityPlayingHeaderSlot(): ActivityGameHeaderSlot | null {
  return useContext(ActivityPlayingHeaderSlotContext);
}

/** True when rendered inside `ActivityPlayingHeaderProvider` (activity play flow — not admin preview). */
export function useActivityPlayingHeaderHostActive(): boolean {
  return useContext(ActivityPlayingHeaderSetSlotContext) != null;
}

/**
 * Publishes mute + phase to the activity header. Unregisters on unmount.
 * When `hostActive` is false, does nothing (e.g. game preview modal).
 */
export function useRegisterActivityGameHeader(
  hostActive: boolean,
  phase: ActivityGameHeaderPhase,
  isMuted: boolean,
  toggleMute: () => void
) {
  const setSlot = useContext(ActivityPlayingHeaderSetSlotContext);
  const toggleRef = useRef(toggleMute);
  toggleRef.current = toggleMute;

  useEffect(() => {
    if (!setSlot || !hostActive) return;
    setSlot({
      phase,
      isMuted,
      toggleMute: () => {
        toggleRef.current();
      },
    });
    return () => {
      setSlot(null);
    };
  }, [hostActive, phase, isMuted, setSlot]);
}

/**
 * When the current step is a game but no child registers a slot (e.g. unknown game type),
 * installs a noop music slot so the header still shows the music control instead of leaderboard.
 */
export function useActivityGameHeaderFallbackWhenNeeded(enabled: boolean, itemKey: string) {
  const setSlot = useContext(ActivityPlayingHeaderSetSlotContext);
  const fallbackRef = useRef<ActivityGameHeaderSlot | null>(null);

  useEffect(() => {
    if (!enabled || !setSlot) return;
    const t = window.setTimeout(() => {
      setSlot((prev) => {
        if (prev !== null) return prev;
        const noop: ActivityGameHeaderSlot = {
          phase: 'playing',
          isMuted: false,
          toggleMute: () => {},
        };
        fallbackRef.current = noop;
        return noop;
      });
    }, 0);
    return () => {
      clearTimeout(t);
      setSlot((prev) => {
        if (prev === fallbackRef.current) {
          fallbackRef.current = null;
          return null;
        }
        return prev;
      });
    };
  }, [enabled, itemKey, setSlot]);
}
