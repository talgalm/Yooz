import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';

const DESKTOP_BREAKPOINT = '@media (min-width: 768px)';

const Outer = styled('div')({
  background: '#fff',
  minHeight: '100dvh',
  width: '100%',
  position: 'relative',
});

const Inner = styled('div')({
  maxWidth: 480,
  margin: '0 auto',
  minHeight: '100dvh',
  background: '#fff',
  position: 'relative',
  [DESKTOP_BREAKPOINT]: {
    maxWidth: 'none',
    width: '100%',
    margin: 0,
  },
});

export function MobileContainer({ children }: { children: ReactNode }) {
  return (
    <Outer>
      <Inner>{children}</Inner>
    </Outer>
  );
}
