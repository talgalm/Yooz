import { useEffect, useState } from 'react';
import type { SuccessPopupContent } from '../components/games/SuccessPopup';

const END_SCREEN_POPUP_DELAY_MS = 900;

export function useEndScreenPopups(popups: SuccessPopupContent[], onEndScreen: boolean) {
  const [closedCount, setClosedCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!onEndScreen) return;
    const id = setTimeout(() => setReady(true), END_SCREEN_POPUP_DELAY_MS);
    return () => clearTimeout(id);
  }, [onEndScreen]);

  return {
    popup: onEndScreen && ready ? popups[closedCount] ?? null : null,
    pending: closedCount < popups.length,
    showNow: () => setReady(true),
    close: () => setClosedCount((count) => count + 1),
  };
}
