import { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import { managerApiFetch } from '../../../utils/managerApi';

interface ControlFlowItem {
  index: number;
  type: 'game' | 'station' | 'mission';
  name: string;
  subType?: string;
}

interface ControlFlowResponse {
  code: string;
  name: string;
  items: ControlFlowItem[];
  lockedFromIndex: number | null;
}

interface Props {
  t: Record<string, string>;
}

// ─── Styled ───

const Card = styled('div')({
  background: '#fff',
  borderRadius: 14,
  padding: '20px 22px',
  border: '1px solid #ece8f0',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  marginBottom: 20,
});

const TopRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
  marginBottom: 6,
});

const Title = styled('h3')({
  margin: 0,
  fontSize: 17,
  fontWeight: 700,
  color: '#222',
});

const Hint = styled('p')({
  margin: 0,
  fontSize: 13,
  color: '#888',
});

const StatusPill = styled('span')<{ active?: boolean }>(({ active }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 10px',
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.4,
  background: active ? 'rgba(220,38,38,0.1)' : 'rgba(34,197,94,0.12)',
  color: active ? '#dc2626' : '#16a34a',
}));

const UnlockBtn = styled('button')({
  padding: '10px 18px',
  fontSize: 14,
  fontWeight: 700,
  color: '#fff',
  background: '#16a34a',
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 0.15s, transform 0.1s',
  '&:hover': { background: '#15803d' },
  '&:active': { transform: 'scale(0.98)' },
  '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
});

const ItemList = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

const ItemRow = styled('div')<{ locked?: boolean }>(({ locked }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '12px 16px',
  borderRadius: 12,
  background: locked ? '#fff5f5' : '#fff',
  border: `1px solid ${locked ? '#fecaca' : '#ece8f0'}`,
  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
  transition: 'background 0.2s, border-color 0.2s',
}));

const IndexBadge = styled('div')({
  flexShrink: 0,
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: '#f0eefa',
  color: '#6c5ce7',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  fontSize: 13,
});

const ItemBody = styled('div')({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
});

const ItemName = styled('div')({
  fontWeight: 700,
  fontSize: 15,
  color: '#222',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const ItemMeta = styled('div')({
  fontSize: 12,
  color: '#999',
});

const TypeBadge = styled('span')<{ kind: 'game' | 'station' | 'mission' }>(({ kind }) => ({
  display: 'inline-block',
  padding: '2px 8px',
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 6,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  background:
    kind === 'game' ? '#fff4e5'
    : kind === 'mission' ? '#e0f2fe'
    : '#f0eefa',
  color:
    kind === 'game' ? '#b45309'
    : kind === 'mission' ? '#0369a1'
    : '#6c5ce7',
  marginInlineEnd: 6,
}));

const LockBtn = styled('button')<{ active?: boolean }>(({ active }) => ({
  flexShrink: 0,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 700,
  border: `1.5px solid ${active ? '#dc2626' : '#e0d8f0'}`,
  borderRadius: 10,
  cursor: 'pointer',
  fontFamily: 'inherit',
  background: active ? '#dc2626' : '#fff',
  color: active ? '#fff' : '#6c5ce7',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  transition: 'all 0.15s',
  '&:hover': active ? { background: '#b91c1c' } : { background: '#f5f1fb', borderColor: '#6c5ce7' },
  '&:active': { transform: 'scale(0.97)' },
  '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
}));

const Empty = styled('div')({
  padding: '24px 16px',
  textAlign: 'center',
  color: '#999',
  fontSize: 14,
});

const ErrorBanner = styled('div')({
  background: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#b91c1c',
  padding: '10px 14px',
  borderRadius: 10,
  fontSize: 13,
  marginBottom: 12,
});

// ─── Component ───

export default function ControlFlowTab({ t }: Props) {
  const [data, setData] = useState<ControlFlowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await managerApiFetch<ControlFlowResponse>('/api/manager/activity');
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setLock = async (lockedFromIndex: number | null) => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await managerApiFetch<{ lockedFromIndex: number | null }>('/api/manager/lock', {
        method: 'POST',
        body: JSON.stringify({ lockedFromIndex }),
      });
      setData((prev) => (prev ? { ...prev, lockedFromIndex: res.lockedFromIndex } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.lockFailed);
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return <Empty>{t.loading}</Empty>;
  }
  if (!data) {
    return <Empty>{error || t.loadFailed}</Empty>;
  }

  const isLocked = data.lockedFromIndex !== null;

  return (
    <>
      <Card>
        <TopRow>
          <div>
            <Title>{t.controlFlowTitle}</Title>
            <Hint>{t.controlFlowHint}</Hint>
          </div>
          <StatusPill active={isLocked}>
            {isLocked ? t.statusLocked : t.statusOpen}
          </StatusPill>
        </TopRow>
        {isLocked && (
          <div style={{ marginTop: 14 }}>
            <UnlockBtn type="button" onClick={() => setLock(null)} disabled={pending}>
              ✓ {t.unlockAll}
            </UnlockBtn>
          </div>
        )}
      </Card>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {data.items.length === 0 ? (
        <Empty>{t.noItems}</Empty>
      ) : (
        <ItemList>
          {data.items.map((item) => {
            const locked = isLocked && item.index >= (data.lockedFromIndex as number);
            const isLockPoint = data.lockedFromIndex === item.index;
            return (
              <ItemRow key={item.index} locked={locked}>
                <IndexBadge>{item.index + 1}</IndexBadge>
                <ItemBody>
                  <ItemName>
                    <TypeBadge kind={item.type}>{t[`type_${item.type}`] || item.type}</TypeBadge>
                    {item.name}
                  </ItemName>
                  {item.subType && <ItemMeta>{item.subType}</ItemMeta>}
                </ItemBody>
                <LockBtn
                  type="button"
                  active={isLockPoint}
                  disabled={pending}
                  onClick={() => setLock(isLockPoint ? null : item.index)}
                  title={isLockPoint ? t.unlockHere : t.lockFromHere}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  {isLockPoint ? t.unlockHere : t.lockFromHere}
                </LockBtn>
              </ItemRow>
            );
          })}
        </ItemList>
      )}
    </>
  );
}
