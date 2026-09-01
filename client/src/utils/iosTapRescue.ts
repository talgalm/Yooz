/**
 * Rescue taps whose `click` iOS swallows.
 *
 * On iPhone the synthetic `click` after a touch is dropped whenever the layout
 * shifts under the finger between touchstart and mouseup. Every full-height
 * container here is sized in dvh/svh, so the Safari toolbar expanding and the
 * on-screen keyboard opening or closing both resize the whole page — the tap
 * lands on the button, `pointerdown`, `pointerup`, `mousedown` and `mouseup`
 * all fire on it, and `click` never comes. The control looks dead until a
 * reload.
 *
 * It is never one control: everything on screen is affected at once, which is
 * why fixing them one at a time (ball game finish button, story popup, roadmap
 * node) only moved the failure to whichever control was tapped next. Pointer
 * events are not suppressed, so watch a tap from pointerdown to pointerup and,
 * if the real click does not turn up, dispatch it once.
 *
 * Measured on the device (iPhone 13 / iOS Safari, 2026-09-01) on the riddle's
 * check button: pointerdown, touchstart, pointerup, touchend, mousedown and
 * mouseup all on `button"בדיקה"`, no click, twice in a row, while the keyboard
 * was closing.
 */

/** Elements a tap is expected to activate. Deliberately not every div: drag
 *  surfaces (order game, image zoom, feedback slider) drive their own pointer
 *  handlers and must not be handed a synthetic click. */
const ACTIVATABLE = 'button, a[href], [role="button"], label, summary';
/** Past this the gesture was a drag or a scroll, not a tap. */
const SLOP_PX = 10;
/** Past this it was a long press (iOS treats those as selection gestures). */
const MAX_TAP_MS = 1500;
/** A real click lands ~1ms after pointerup; wait well past that before acting. */
const CLICK_GRACE_MS = 320;

export function installIosTapRescue(): () => void {
  if (typeof window === 'undefined' || typeof window.PointerEvent !== 'function') {
    return () => {};
  }

  let down: { target: Element; x: number; y: number; at: number } | null = null;
  let lastClickAt = 0;

  const activatable = (node: EventTarget | null): Element | null => {
    const el = node as Element | null;
    return el && typeof el.closest === 'function' ? el.closest(ACTIVATABLE) : null;
  };

  const onPointerDown = (e: Event) => {
    const pe = e as PointerEvent;
    // Desktop clicks are never suppressed — leave the mouse alone entirely.
    if (!pe.isPrimary || pe.pointerType === 'mouse') {
      down = null;
      return;
    }
    const target = activatable(pe.target);
    down = target ? { target, x: pe.clientX, y: pe.clientY, at: Date.now() } : null;
  };

  const onPointerUp = (e: Event) => {
    const pe = e as PointerEvent;
    const start = down;
    down = null;
    if (!start || !pe.isPrimary) return;
    if (Date.now() - start.at > MAX_TAP_MS) return;
    if (Math.hypot(pe.clientX - start.x, pe.clientY - start.y) > SLOP_PX) return;
    if (activatable(pe.target) !== start.target) return;

    const releasedAt = Date.now();
    window.setTimeout(() => {
      if (lastClickAt >= releasedAt) return;              // the browser delivered it
      if (!start.target.isConnected) return;             // handled already; gone
      if ((start.target as HTMLButtonElement).disabled) return;
      (start.target as HTMLElement).click();
    }, CLICK_GRACE_MS);
  };

  const onClick = () => { lastClickAt = Date.now(); };
  const onCancel = () => { down = null; };

  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('pointerup', onPointerUp, true);
  window.addEventListener('pointercancel', onCancel, true);
  window.addEventListener('click', onClick, true);

  return () => {
    window.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener('pointerup', onPointerUp, true);
    window.removeEventListener('pointercancel', onCancel, true);
    window.removeEventListener('click', onClick, true);
  };
}
