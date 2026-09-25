
const ACTIVATABLE = 'button, a[href], [role="button"], label, summary';
const SLOP_PX = 10;
const MAX_TAP_MS = 1500;
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
      if (lastClickAt >= releasedAt) return;
      if (!start.target.isConnected) return;
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
