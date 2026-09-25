import { styled } from '@mui/material/styles';
import { useEffect, useState, type ReactNode } from 'react';
import { isStorageHealthy } from '../utils/storageHealth';
import { installIosTapRescue } from '../utils/iosTapRescue';
import { useTranslations } from '../context/LanguageContext';
import { texts } from './MobileContainer.i18n';

const connection = (navigator as Navigator & {
  connection?: EventTarget & { effectiveType?: string };
}).connection;

function isReceptionWeak(): boolean {
  if (!navigator.onLine) return true;
  return connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g';
}

function useWeakReception(): boolean {
  const [weak, setWeak] = useState(isReceptionWeak);
  useEffect(() => {
    const update = () => setWeak(isReceptionWeak());
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    connection?.addEventListener('change', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      connection?.removeEventListener('change', update);
    };
  }, []);
  return weak;
}

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

const ReceptionBanner = styled('div')({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 2000,
  margin: '0 auto',
  maxWidth: 480,
  background: '#dc2626',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  padding: '8px 12px',
  textAlign: 'center',
  lineHeight: 1.35,
  [DESKTOP_BREAKPOINT]: {
    maxWidth: 'none',
  },
});

export function MobileContainer({ children }: { children: ReactNode }) {
  const weakReception = useWeakReception();
  const t = useTranslations(texts);
  useEffect(installIosTapRescue, []);
  return (
    <Outer>
      <Inner>
        {weakReception && (
          <ReceptionBanner>{t.weakReception}</ReceptionBanner>
        )}
        {!isStorageHealthy() && (
          <StorageBanner>{t.storageBlocked}</StorageBanner>
        )}
        {children}
      </Inner>
    </Outer>
  );
}
