import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { isStorageHealthy } from '../utils/storageHealth';

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

const StorageBanner = styled('div')({
  background: '#fde68a',
  color: '#1a143f',
  fontSize: 13,
  fontWeight: 700,
  padding: '8px 12px',
  textAlign: 'center',
  lineHeight: 1.35,
});

export function MobileContainer({ children }: { children: ReactNode }) {
  return (
    <Outer>
      <Inner>
        {!isStorageHealthy() && (
          <StorageBanner>
            שמירה מקומית חסומה — צאו ממצב גלישה פרטית כדי לא לאבד התקדמות
          </StorageBanner>
        )}
        {children}
      </Inner>
    </Outer>
  );
}
