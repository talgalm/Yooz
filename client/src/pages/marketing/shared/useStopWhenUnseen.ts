import { RefObject, useEffect } from 'react';

interface Options {
  src?: string;
  offscreen?: boolean;
}

export default function useStopWhenUnseen(
  ref: RefObject<HTMLVideoElement | null>,
  { src, offscreen = true }: Options = {},
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const pauseIfHidden = () => {
      if (document.hidden) el.pause();
    };
    document.addEventListener('visibilitychange', pauseIfHidden);

    const io =
      offscreen && typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries) if (!entry.isIntersecting) el.pause();
            },
            { threshold: 0.25 },
          )
        : null;
    io?.observe(el);

    return () => {
      document.removeEventListener('visibilitychange', pauseIfHidden);
      io?.disconnect();
      setTimeout(() => {
        if (!el.isConnected) el.pause();
      }, 0);
    };
  }, [ref, src, offscreen]);
}
