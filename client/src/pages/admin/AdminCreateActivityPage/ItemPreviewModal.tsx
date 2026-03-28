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

const Overlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
});

const Container = styled('div')({
  background: '#fff',
  borderRadius: 16,
  width: '95vw',
  maxWidth: 480,
  height: '85vh',
  maxHeight: 900,
  overflow: 'hidden',
  position: 'relative',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  display: 'flex',
  flexDirection: 'column',
});

const Header = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid #e8e8ec',
  background: '#fff',
  flexShrink: 0,
});

const HeaderTitle = styled('span')({
  fontWeight: 600,
  fontSize: 15,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const CloseButton = styled('button')({
  background: 'none',
  border: 'none',
  fontSize: 22,
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 6,
  color: '#666',
  '&:hover': { background: '#f0f0f0' },
});

const Body = styled('div')({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
});

const StationContent = styled('div')({
  padding: 24,
  textAlign: 'center',
});

const StationText = styled('p')({
  fontSize: 15,
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
});

const LoadingText = styled('div')({
  padding: 40,
  textAlign: 'center',
  color: '#888',
});

interface ItemPreviewModalProps {
  item: ModuleItem;
  onClose: () => void;
}

export default function ItemPreviewModal({ item, onClose }: ItemPreviewModalProps) {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(item.settings || null);
  const [loading, setLoading] = useState(!item.settings);

  // Fetch settings if not available
  useEffect(() => {
    if (item.settings) return;
    setLoading(true);
    const endpoint = item.itemType === 'game'
      ? `/api/admin/games/${item.ref}`
      : `/api/admin/stations/${item.ref}`;
    adminApiFetch<{ game?: { settings: Record<string, unknown> }; station?: { settings: Record<string, unknown> } }>(endpoint)
      .then((data) => {
        const s = data.game?.settings || data.station?.settings || {};
        setSettings(s);
      })
      .catch(() => setSettings({}))
      .finally(() => setLoading(false));
  }, [item]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const noOp = () => { /* preview complete — no-op */ };

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
        default: return <StationContent><StationText>Unknown game type: {item.subType}</StationText></StationContent>;
      }
    }

    // Station rendering
    if (item.subType === 'narrative') {
      const stationData = {
        _id: item.ref,
        name: item.name,
        type: 'station' as const,
        stationType: 'narrative' as const,
        settings,
      };
      return <NarrativeStation station={stationData} onContinue={noOp} />;
    }

    if (item.subType === 'badge') {
      const stationData = {
        _id: item.ref,
        name: item.name,
        type: 'station' as const,
        stationType: 'badge' as const,
        settings,
      };
      return <BadgeStation station={stationData} onContinue={noOp} />;
    }

    if (item.subType === 'text') {
      return (
        <StationContent>
          <StationText>{(settings.content as string) || 'No text content'}</StationText>
        </StationContent>
      );
    }

    if (item.subType === 'video') {
      return (
        <StationContent>
          <video
            src={settings.mediaUrl as string}
            controls
            autoPlay
            muted
            playsInline
            style={{ width: '100%', maxHeight: 400, borderRadius: 8 }}
          />
        </StationContent>
      );
    }

    if (item.subType === 'image') {
      return (
        <StationContent>
          <img
            src={settings.mediaUrl as string}
            alt=""
            style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 8 }}
          />
        </StationContent>
      );
    }

    return <StationContent><StationText>Unknown station type: {item.subType}</StationText></StationContent>;
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <Container>
        <Header>
          <HeaderTitle>{item.name}</HeaderTitle>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </Header>
        <Body>{renderContent()}</Body>
      </Container>
    </Overlay>
  );
}
