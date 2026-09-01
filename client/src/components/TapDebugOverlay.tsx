import { useEffect, useState } from 'react';

/**
 * Temporary field diagnostic for the "buttons go dead after the ball game on
 * iPhone" bug — remove once that is understood.
 *
 * What we know: after the ball game station, `pointerup` still reaches the right
 * element (pointerup-driven controls work) but no `click` ever arrives, for the
 * whole page, until a reload. This prints every raw event the page receives so
 * we can see WHICH one stops coming and whether something is preventing it.
 *
 * Off unless the URL carries `?tapdebug=1`; the flag then sticks for the tab so
 * it survives in-app navigation. Listeners are capture-phase on window, so
 * nothing in the app can hide an event from them, and the panel itself is
 * `pointer-events: none` so it cannot swallow the taps it is measuring.
 */

const FLAG_KEY = 'yooz_tap_debug';
const EVENTS = ['touchstart', 'touchend', 'touchcancel', 'pointerdown', 'pointerup', 'pointercancel', 'mousedown', 'mouseup', 'click'] as const;
const MAX_LINES = 16;

function isOn(): boolean {
  try {
    if (new URLSearchParams(window.location.search).has('tapdebug')) {
      sessionStorage.setItem(FLAG_KEY, '1');
    }
    return sessionStorage.getItem(FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

function describe(target: EventTarget | null): string {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return '?';
  const text = (el.textContent || '').trim().slice(0, 14);
  const disabled = (el as HTMLButtonElement).disabled ? ' DISABLED' : '';
  return `${el.tagName.toLowerCase()}${text ? `"${text}"` : ''}${disabled}`;
}

export default function TapDebugOverlay() {
  const [on] = useState(isOn);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (!on) return;
    const removers = EVENTS.map((type) => {
      const handler = (e: Event) => {
        const stamp = new Date().toISOString().slice(17, 23);
        const flag = e.defaultPrevented ? ' [prevented]' : '';
        setLines((prev) => [`${stamp} ${type} → ${describe(e.target)}${flag}`, ...prev].slice(0, MAX_LINES));
      };
      window.addEventListener(type, handler, true);
      return () => window.removeEventListener(type, handler, true);
    });
    return () => removers.forEach((remove) => remove());
  }, [on]);

  if (!on) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147483647,
        pointerEvents: 'none',
        background: 'rgba(0,0,0,0.82)',
        color: '#4ade80',
        font: '11px/1.35 ui-monospace, Menlo, monospace',
        padding: '6px 8px',
        maxHeight: '40vh',
        overflow: 'hidden',
        direction: 'ltr',
        textAlign: 'left',
      }}
    >
      {lines.length === 0 ? <div>tap debug on — tap something</div> : lines.map((line, i) => <div key={i}>{line}</div>)}
    </div>
  );
}
