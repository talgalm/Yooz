import { styled } from '@mui/material/styles';

interface MuteButtonProps {
  isMuted: boolean;
  onToggle: () => void;
}

export default function MuteButton({ isMuted, onToggle }: MuteButtonProps) {
  return (
    <MuteBtn onClick={onToggle} aria-label={isMuted ? 'Unmute' : 'Mute'}>
      {isMuted ? <MutedIcon /> : <SpeakerIcon />}
    </MuteBtn>
  );
}

function SpeakerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
      <path
        d="M15.54 8.46a5 5 0 010 7.07"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.07 4.93a10 10 0 010 14.14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
      <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const MuteBtn = styled('button')({
  position: 'fixed',
  bottom: 18,
  left: 18,
  zIndex: 100,
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: '2px solid rgba(255,255,255,0.5)',
  background: 'rgba(0,0,0,0.35)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backdropFilter: 'blur(4px)',
  transition: 'background 0.2s, transform 0.15s',
  '&:active': {
    transform: 'scale(0.9)',
  },
});
