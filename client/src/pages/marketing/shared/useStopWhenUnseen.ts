import { RefObject, useEffect } from 'react';

interface Options {
  /**
   * The current source. A keyed swap between clips replaces the element, and
   * the hook has to re-bind to the new one - passing the src does that.
   */
  src?: string;
  /**
   * Also pause when the clip scrolls out of view. Off for a looping background
   * clip, which would freeze on a frame instead of resuming when scrolled back.
   */
  offscreen?: boolean;
}

/**
 * Stops a video the moment nobody is watching it: scrolled away, tab in the
 * background, or the page swapped out from under it. Route changes are the
 * reason this exists - React detaches the element, but the browser can keep its
 * audio running, so a clip ends up playing over the next page.
 */
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
      /**
       * Only if the element really left the page. StrictMode runs this cleanup
       * between two mounts of the same element in development, so pausing
       * unconditionally would kill an autoplay a tick after it started; the
       * timeout is what lets us tell the two apart. Clearing `src` here has the
       * same trap and is worse - React does not re-set an unchanged `src`, so
       * the video would come back empty.
       */
      setTimeout(() => {
        if (!el.isConnected) el.pause();
      }, 0);
    };
  }, [ref, src, offscreen]);
}
