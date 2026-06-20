import { styled } from '@mui/material/styles';

export const GroupEntryButton = styled('button')({
  width: '100%',
  padding: 18,
  fontSize: 17,
  fontWeight: 700,
  color: '#fff',
  background: 'rgba(255,255,255,0.2)',
  border: '2px solid rgba(255,255,255,0.45)',
  borderRadius: 12,
  cursor: 'pointer',
  transition: 'background 0.2s, transform 0.1s',
  fontFamily: 'inherit',
  textAlign: 'center',
  '&:active': {
    transform: 'scale(0.98)',
  },
  '&:disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

export const GroupEntrySecondaryButton = styled('button')({
  width: '100%',
  padding: 12,
  fontSize: 15,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.85)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textAlign: 'center',
  marginTop: 8,
});

export const GroupEntryInput = styled('input')({
  width: '100%',
  padding: '16px 20px',
  fontSize: 16,
  border: 'none',
  borderRadius: 12,
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
  textAlign: 'start',
  fontFamily: 'inherit',
  '&::placeholder': {
    color: '#aaa',
  },
});

export const GroupEntryForm = styled('form')({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: '100%',
});

export const GroupEntryError = styled('p')({
  color: '#ffcdd2',
  fontSize: 14,
  margin: 0,
  textAlign: 'center',
});

export const GroupEntryHint = styled('p')<{ status?: 'ok' | 'error' | 'neutral' }>(({ status }) => ({
  fontSize: 13,
  margin: '-4px 0 0',
  textAlign: 'start',
  color: status === 'ok' ? '#c8e6c9' : status === 'error' ? '#ffcdd2' : 'rgba(255,255,255,0.7)',
}));

export const GroupEntryTitle = styled('h2')({
  color: '#fff',
  fontSize: 22,
  fontWeight: 700,
  margin: '0 0 8px',
  textAlign: 'center',
});

export const GroupEntrySubtitle = styled('p')({
  color: 'rgba(255,255,255,0.85)',
  fontSize: 15,
  margin: '0 0 20px',
  textAlign: 'center',
});

export const InviteLinkBox = styled('div')({
  background: 'rgba(255,255,255,0.15)',
  borderRadius: 12,
  padding: '14px 16px',
  color: '#fff',
  fontSize: 14,
  wordBreak: 'break-all',
  textAlign: 'center',
  border: '1px solid rgba(255,255,255,0.25)',
});

export const TeamNameBadge = styled('div')({
  display: 'inline-block',
  background: 'rgba(255,255,255,0.2)',
  borderRadius: 20,
  padding: '8px 16px',
  color: '#fff',
  fontSize: 16,
  fontWeight: 700,
  marginBottom: 16,
});
