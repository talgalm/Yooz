import { styled, keyframes } from '@mui/material/styles';
import { PRIMARY, PRIMARY_LIGHT } from '../styled';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`;

export const Backdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.3)',
  zIndex: 100,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  animation: `${fadeIn} 0.15s ease-out`,
});

export const DrawerPanel = styled('div')({
  background: '#fff',
  borderRadius: '16px 16px 0 0',
  width: '100%',
  maxWidth: 480,
  padding: '12px 20px 24px',
  animation: `${slideUp} 0.2s ease-out`,
});

export const DrawerHandle = styled('div')({
  width: 36,
  height: 4,
  background: '#ddd',
  borderRadius: 2,
  margin: '0 auto 16px',
});

export const OptionList = styled('ul')({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

export const OptionButton = styled('button')<{ active?: boolean }>(({ active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '14px 12px',
  fontSize: 16,
  background: active ? PRIMARY_LIGHT : 'none',
  border: 'none',
  borderRadius: 12,
  cursor: 'pointer',
  textAlign: 'start' as const,
  fontFamily: 'inherit',
  '&:active': {
    background: '#f5f5f5',
  },
}));

export const OptionFlag = styled('span')({
  fontSize: 24,
  lineHeight: 1,
});

export const OptionLabel = styled('span')({
  flex: 1,
  fontWeight: 500,
  color: '#333',
});

export const OptionCheck = styled('span')({
  color: PRIMARY,
  fontWeight: 700,
  fontSize: 18,
});
