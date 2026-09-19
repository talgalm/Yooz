import { useEffect, useRef, ReactNode } from 'react';
import { RevealRoot } from './styled';

interface RevealProps {
  children: ReactNode;
  /** Stagger within a row of cards, in ms. */
  delay?: number;
  className?: string;
}

/**
 * Fades and lifts its children in the first time they scroll into view.
 *
 * Each instance owns its observer so the component can be dropped anywhere,
 * including inside `.map()`, without the caller wiring up a ref. It unobserves
 * on first intersection — once revealed, a section never hides again on scroll
 * back up.
 *
 * Visibility is written to `data-visible` rather than React state on purpose:
 * a page carries dozens of these, and re-rendering each one on scroll is wasted
 * work when the whole effect is a CSS transition.
 */
export default function Reveal({ children, delay, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No observer (older browser, SSR-ish harness): show the content rather than
    // leaving it permanently transparent.
    if (typeof IntersectionObserver === 'undefined') {
      el.dataset.visible = 'true';
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          el.dataset.visible = 'true';
          io.unobserve(el);
        }
      },
      // Fire a little before the element is fully on screen, so the lift finishes
      // about when it reaches comfortable reading position.
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <RevealRoot ref={ref} delay={delay} className={className}>
      {children}
    </RevealRoot>
  );
}
