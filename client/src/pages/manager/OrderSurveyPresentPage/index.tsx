import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { managerApiFetch } from '../../../utils/managerApi';
import { texts } from './OrderSurveyPresentPage.i18n';

interface ActivityItem {
  index: number;
  type: string;
  name: string;
  subType?: string;
  orderMode?: 'quiz' | 'survey';
  gameId?: string;
}

interface LiveState {
  active: boolean;
  itemIndex: number | null;
  phase: 'voting' | 'results' | null;
  resultsRevealed: boolean;
  voted: number;
  total: number;
  aggregatedRanking: { item: string; bordaScore: number; rank: number }[] | null;
}

const Page = styled('div')({
  minHeight: '100vh',
  background: '#0f172a',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
});

const TopBar = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 24px',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  flexWrap: 'wrap',
  gap: 12,
});

const Title = styled('h1')({ margin: 0, fontSize: 20, fontWeight: 700 });

const BackBtn = styled('button')({
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'transparent',
  color: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 600,
});

const Controls = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  padding: '16px 24px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  alignItems: 'center',
});

const Select = styled('select')({
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.2)',
  background: '#1e293b',
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: 14,
  minWidth: 220,
});

const ActionBtn = styled('button')<{ variant?: 'primary' | 'danger' }>(({ variant }) => ({
  padding: '10px 18px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 700,
  fontSize: 14,
  background: variant === 'danger' ? '#dc2626' : '#6c5ce7',
  color: '#fff',
  '&:disabled': { opacity: 0.45, cursor: 'not-allowed' },
}));

const Stage = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 24px',
  textAlign: 'center',
});

const VoteCounter = styled('div')({
  fontSize: 'clamp(48px, 12vw, 120px)',
  fontWeight: 900,
  letterSpacing: -2,
  lineHeight: 1.1,
});

const VoteLabel = styled('div')({
  fontSize: 'clamp(20px, 4vw, 36px)',
  opacity: 0.85,
  marginTop: 16,
});

const ResultsList = styled('div')({
  width: 'min(720px, 100%)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
});

const ResultRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '18px 22px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  textAlign: 'start',
});

const RankBadge = styled('div')({
  width: 44,
  height: 44,
  borderRadius: '50%',
  background: '#6c5ce7',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  fontSize: 18,
  flexShrink: 0,
});

const ResultText = styled('div')({
  flex: 1,
  fontSize: 'clamp(18px, 3vw, 26px)',
  fontWeight: 700,
});

const ResultScore = styled('div')({
  fontSize: 14,
  opacity: 0.65,
});

const EmptyText = styled('p')({ opacity: 0.6, fontSize: 18 });

const POLL_MS = 3000;

export default function OrderSurveyPresentPage() {
  const t = useTranslations(texts);
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [live, setLive] = useState<LiveState | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const surveyItems = items.filter((i) => i.type === 'game' && i.subType === 'order' && i.orderMode === 'survey');

  const loadActivity = useCallback(async () => {
    const data = await managerApiFetch<{
      items: ActivityItem[];
      orderSurveySession?: { itemIndex: number } | null;
    }>('/api/manager/activity');
    setItems(data.items);
    if (data.orderSurveySession?.itemIndex != null) {
      setSelectedIndex(data.orderSurveySession.itemIndex);
    } else if (surveyItems.length === 1) {
      setSelectedIndex(surveyItems[0].index);
    }
  }, [surveyItems.length]);

  const loadLive = useCallback(async () => {
    const state = await managerApiFetch<LiveState>('/api/manager/order-survey/live');
    setLive(state);
    if (state.itemIndex != null) setSelectedIndex(state.itemIndex);
  }, []);

  useEffect(() => {
    loadActivity().catch(() => setError(t.loadFailed));
  }, []);

  useEffect(() => {
    let timer: number;
    const tick = async () => {
      try {
        await loadLive();
      } catch {
      }
      timer = window.setTimeout(tick, POLL_MS);
    };
    timer = window.setTimeout(tick, 0);
    return () => clearTimeout(timer);
  }, [loadLive]);

  const runAction = async (fn: () => Promise<unknown>) => {
    setPending(true);
    setError('');
    try {
      await fn();
      await loadLive();
    } catch {
      setError(t.actionFailed);
    } finally {
      setPending(false);
    }
  };

  const selectedItem = surveyItems.find((i) => i.index === selectedIndex);

  return (
    <Page>
      <TopBar>
        <Title>{t.title}</Title>
        <BackBtn type="button" onClick={() => navigate('/manager/dashboard')}>{t.back}</BackBtn>
      </TopBar>

      <Controls>
        {surveyItems.length === 0 ? (
          <EmptyText style={{ margin: 0 }}>{t.noSurveyGames}</EmptyText>
        ) : (
          <>
            <Select
              value={selectedIndex ?? ''}
              onChange={(e) => setSelectedIndex(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">{t.selectItem}</option>
              {surveyItems.map((item) => (
                <option key={item.index} value={item.index}>
                  {item.index + 1}. {item.name}
                </option>
              ))}
            </Select>
            <ActionBtn
              type="button"
              disabled={pending || selectedIndex == null}
              onClick={() => runAction(() => managerApiFetch('/api/manager/order-survey/start', {
                method: 'POST',
                body: JSON.stringify({ itemIndex: selectedIndex, gameId: selectedItem?.gameId }),
              }))}
            >
              {t.startVoting}
            </ActionBtn>
            <ActionBtn
              type="button"
              variant="danger"
              disabled={pending || !live?.active || live.phase !== 'voting'}
              onClick={() => runAction(() => managerApiFetch('/api/manager/order-survey/close', { method: 'POST', body: '{}' }))}
            >
              {t.closeVoting}
            </ActionBtn>
            <ActionBtn
              type="button"
              disabled={pending || !live?.active || live.phase !== 'results' || live.resultsRevealed}
              onClick={() => runAction(() => managerApiFetch('/api/manager/order-survey/reveal', { method: 'POST', body: '{}' }))}
            >
              {t.revealResults}
            </ActionBtn>
          </>
        )}
        {error && <span style={{ color: '#f87171', fontSize: 13 }}>{error}</span>}
      </Controls>

      <Stage>
        {!live?.active ? (
          <EmptyText>{t.noSession}</EmptyText>
        ) : live.phase === 'voting' ? (
          <>
            <VoteLabel>{t.votingLive}</VoteLabel>
            <VoteCounter>
              {live.voted} / {live.total}
            </VoteCounter>
            <VoteLabel>{t.voted}</VoteLabel>
          </>
        ) : (
          <>
            <VoteLabel style={{ marginBottom: 28 }}>{t.resultsTitle}</VoteLabel>
            <ResultsList>
              {(live.aggregatedRanking ?? []).map((row) => (
                <ResultRow key={row.item}>
                  <RankBadge>{row.rank}</RankBadge>
                  <ResultText>{row.item}</ResultText>
                  <ResultScore>{t.score}: {row.bordaScore}</ResultScore>
                </ResultRow>
              ))}
            </ResultsList>
          </>
        )}
      </Stage>
    </Page>
  );
}
