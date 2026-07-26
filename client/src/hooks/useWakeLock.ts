import { useEffect } from 'react';

/**
 * Keeps the screen awake while `active`. Re-acquires the lock when the tab
 * regains visibility (the browser silently releases it on background/lock).
 * No-op where the Wake Lock API is unsupported or the request is denied.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const acquire = () => {
      navigator.wakeLock.request('screen')
        .then((l) => { lock = l; })
        .catch(() => { /* denied (battery saver etc.) — nothing to do */ });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
