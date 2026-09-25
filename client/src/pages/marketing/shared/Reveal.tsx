import { useEffect, useRef, ReactNode } from 'react';
import { RevealRoot } from './styled';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export default function Reveal({ children, delay, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

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
