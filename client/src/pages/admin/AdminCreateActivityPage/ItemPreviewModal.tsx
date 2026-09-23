import { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { adminApiFetch } from '../../../utils/adminApi';
import type { ModuleItem } from './types';

// Game components
import OrderGame from '../../../components/games/OrderGame';
import TriviaGame from '../../../components/games/TriviaGame';
import PuzzleGame from '../../../components/games/PuzzleGame';
import TrueFalseGame from '../../../components/games/TrueFalseGame';
import BallGame from '../../../components/games/BallGame';
import TrashSortGame from '../../../components/games/TrashSortGame';

// Station components
import NarrativeStation from '../../../components/stations/NarrativeStation';
import BadgeStation from '../../../components/stations/BadgeStation';
import CollageStation from '../../../components/stations/CollageStation';
import FeedbackStation from '../../../components/stations/FeedbackStation';

const Overlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
});

const Container = styled('div')({
  background: '#fff',
  borderRadius: 20,
  width: 'min(300px, calc(100vw - 24px))',
  height: 'min(500px, calc(100vh - 24px))',
  overflow: 'hidden',
  position: 'relative',
  boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
  display: 'flex',
  flexDirection: 'column',
});

const Header = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 14px',
  borderBottom: '1px solid #e8e8ec',
  background: '#fafafa',
  flexShrink: 0,
});

const HeaderTitle = styled('span')({
  fontWeight: 600,
  fontSize: 13,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: '#333',
});

const HeaderBadge = styled('span')({
  fontSize: 11,
  fontWeight: 500,
  padding: '2px 8px',
  borderRadius: 10,
  background: '#f0eefa',
  color: '#6c5ce7',
  flexShrink: 0,
  marginInlineStart: 8,
});

const CloseButton = styled('button')({
  background: 'none',
  border: 'none',
  fontSize: 18,
  cursor: 'pointer',
  padding: '2px 6px',
  borderRadius: 6,
  color: '#999',
  lineHeight: 1,
  '&:hover': { background: '#f0f0f0', color: '#333' },
});

const Body = styled('div')({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  position: 'relative',
});

const StationContent = styled('div')({
  padding: 20,
  textAlign: 'center',
});

const StationText = styled('p')({
  fontSize: 14,
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
  color: '#444',
});

const LoadingText = styled('div')({
  padding: 32,
  textAlign: 'center',
  color: '#aaa',
  fontSize: 13,
});

const UnknownType = styled('div')({
  padding: 32,
  textAlign: 'center',
  color: '#999',
  fontSize: 13,
});

interface ItemPreviewModalProps {
  item: ModuleItem;
  onClose: () => void;
}

export default function ItemPreviewModal({ item, onClose }: ItemPreviewModalProps) {
  // Always fetch fresh — cached settings on `item` may be stale if the user
  // edited the underlying game/station after opening the activity editor.
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const endpoint = item.itemType === 'game'
      ? `/api/admin/games/${item.ref}`
      : `/api/admin/stations/${item.ref}`;
    adminApiFetch<{ game?: { settings: Record<string, unknown> }; station?: { settings: Record<string, unknown> } }>(endpoint)
      .then((data) => {
        const s = data.game?.settings || data.station?.settings || item.settings || {};
        setSettings(s);
      })
      .catch(() => setSettings(item.settings || {}))
      .finally(() => setLoading(false));
  }, [item]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noOp = (() => { /* preview — no-op */ }) as (...args: any[]) => void;

  const buildStationData = (stationType: string) => ({
    _id: item.ref,
    name: item.name,
    type: 'station' as const,
    stationType: stationType as 'text' | 'video' | 'image' | 'narrative' | 'badge' | 'collage' | 'feedback' | 'riddle',
    settings: settings!,
    ...(item.collageSplit && { collageSplit: item.collageSplit }),
  });

  const renderContent = () => {
    if (loading || !settings) return <LoadingText>Loading...</LoadingText>;

    if (item.itemType === 'game') {
      const gameData = { _id: item.ref, name: item.name, type: item.subType || '', settings };

      switch (item.subType) {
        case 'order': return <OrderGame game={gameData} onComplete={noOp} />;
        case 'trivia': return <TriviaGame game={gameData} onComplete={noOp} />;
        case 'puzzle': return <PuzzleGame game={gameData} onComplete={noOp} />;
        case 'trueFalse': return <TrueFalseGame game={gameData} onComplete={noOp} />;
        case 'ballGame': return <BallGame game={gameData} onComplete={noOp} />;
        case 'trashSort': return <TrashSortGame game={gameData} onComplete={noOp} />;
        default: return <UnknownType>Unknown game type: {item.subType}</UnknownType>;
      }
    }

    // Station rendering
    switch (item.subType) {
      case 'narrative':
        return <NarrativeStation station={buildStationData('narrative')} onContinue={noOp} />;
      case 'badge':
        return <BadgeStation station={buildStationData('badge')} onContinue={noOp} />;
      case 'collage':
        return <CollageStation station={buildStationData('collage')} onContinue={noOp} />;
      case 'feedback':
        return <FeedbackStation station={buildStationData('feedback')} onContinue={noOp} />;
      case 'text':
        return (
          <StationContent>
            <StationText>{(settings.content as string) || 'No text content'}</StationText>
          </StationContent>
        );
      case 'video':
        return (
          <StationContent>
            <video
              src={settings.mediaUrl as string}
              controls
              autoPlay
              muted
              playsInline
              style={{ width: '100%', maxHeight: 300, borderRadius: 8 }}
            />
          </StationContent>
        );
      case 'image':
        return (
          <StationContent>
            <img
              src={settings.mediaUrl as string}
              alt=""
              style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 8 }}
            />
          </StationContent>
        );
      case 'riddle': {
        const riddleAnswer = (settings.answer as string) || '';
        const isRTL = /[\u0590-\u05FF]/.test(riddleAnswer);
        return (
          <StationContent>
            {!!settings.clue && (
              <StationText style={{ fontWeight: 600, marginBottom: 12 }}>{settings.clue as string}</StationText>
            )}
            {riddleAnswer && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', direction: isRTL ? 'rtl' : 'ltr', marginTop: 8 }}>
                {riddleAnswer.split(' ').map((word, wi) => (
                  <div key={wi} style={{ display: 'flex', gap: 3 }}>
                    {word.split('').map((_, ci) => (
                      <div key={ci} style={{ width: 28, height: 34, border: '2px solid #bbb', borderRadius: 6, background: '#fafafa' }} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </StationContent>
        );
      }
      default:
        return <UnknownType>Unknown station type: {item.subType}</UnknownType>;
    }
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <Container>
        <Header>
          <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
            <HeaderTitle>{item.name}</HeaderTitle>
            <HeaderBadge>{item.subType || item.itemType}</HeaderBadge>
          </div>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </Header>
        <Body>{renderContent()}</Body>
      </Container>
    </Overlay>
  );
}
