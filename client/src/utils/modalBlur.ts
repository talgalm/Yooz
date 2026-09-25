import { useEffect } from 'react';

const CLASS = 'yooz-modal-blur';
let openCount = 0;

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
