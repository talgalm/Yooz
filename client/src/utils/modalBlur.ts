import { useEffect } from 'react';

const CLASS = 'yooz-modal-blur';
let openCount = 0;

/**
 * Blur the app content while an overlay is open.
 *
 * Ref-counted, because more than one overlay can be mounted at once (a hint
 * modal over a station that already has its transcript popup open) — the last
 * one to close is the one that clears the blur.
 */
export function useModalBlur(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.getElementById('root');
    openCount += 1;
    root?.classList.add(CLASS);
    return () => {
      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) root?.classList.remove(CLASS);
    };
  }, [active]);
}
