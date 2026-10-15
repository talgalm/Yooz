import { createPortal } from 'react-dom';
import { styled } from '@mui/material/styles';
import { resolveVideoSource } from '../../../utils/videoSource';

export interface TriviaSuccessPopupContent {
  title?: string;
  contentType?: 'text' | 'image' | 'video';
  text?: string;
  image?: string;
  video?: string;
}

export function hasSuccessPopupContent(popup?: TriviaSuccessPopupContent | null): popup is TriviaSuccessPopupContent {
  if (!popup) return false;
  if (popup.contentType === 'image') return !!popup.image?.trim();
  if (popup.contentType === 'video') return !!popup.video?.trim();
  return !!popup.text?.trim() || !!popup.title?.trim();
}

const Overlay = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 1300,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  boxSizing: 'border-box',
  background: 'rgba(0, 0, 0, 0.55)',
});

const Card = styled('div')({
  width: '100%',
  maxWidth: 420,
  maxHeight: '88vh',
  overflowY: 'auto',
  background: '#fff',
  borderRadius: 20,
  padding: '22px 20px 18px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3)',
});

const Title = styled('div')({
  fontSize: 22,
  fontWeight: 800,
  textAlign: 'center',
  color: '#1d2433',
  lineHeight: 1.3,
});

const Text = styled('div')({
  fontSize: 18,
  lineHeight: 1.55,
  textAlign: 'center',
  color: '#333',
  whiteSpace: 'pre-wrap',
});

const Media = styled('div')({
  width: '100%',
  borderRadius: 14,
  overflow: 'hidden',
  background: '#000',
  '& img, & video': { display: 'block', width: '100%', maxHeight: '55vh', objectFit: 'contain' },
});

const Frame = styled('iframe')({
  display: 'block',
  width: '100%',
  aspectRatio: '16 / 9',
  border: 0,
});

const ContinueButton = styled('button')({
  width: '100%',
  padding: '14px 18px',
  fontSize: 18,
  fontWeight: 800,
  color: '#fff',
  background: '#6c5ce7',
  border: 'none',
  borderRadius: 14,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

export default function TriviaSuccessPopup({ popup, continueLabel, onClose }: {
  popup: TriviaSuccessPopupContent;
  continueLabel: string;
  onClose: () => void;
}) {
  const video = popup.contentType === 'video' && popup.video ? resolveVideoSource(popup.video) : null;
  return createPortal(
    <Overlay role="dialog" aria-modal="true">
      <Card>
        {popup.title?.trim() && <Title>{popup.title}</Title>}
        {popup.contentType === 'image' && popup.image ? (
          <Media><img src={popup.image} alt="" /></Media>
        ) : video ? (
          <Media>
            {video.kind === 'iframe'
              ? <Frame src={video.src} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen />
              : <video src={video.src} controls autoPlay playsInline />}
          </Media>
        ) : (
          popup.text?.trim() && <Text>{popup.text}</Text>
        )}
        <ContinueButton type="button" onClick={onClose}>{continueLabel}</ContinueButton>
      </Card>
    </Overlay>,
    document.body,
  );
}
