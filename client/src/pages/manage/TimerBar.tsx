import { useState } from 'react';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../context/LanguageContext';
import { useManageAuth } from '../../context/ManageAuthContext';
import { texts } from './time.i18n';
import { useManageTimer } from './TimerContext';
import { refName } from './manageTypes';
import { formatClock } from './duration';
import { PRIMARY, PRIMARY_LIGHT, BORDER } from '../../components/styled';
import { MOBILE } from './manageUi';
import StartTimerModal from './StartTimerModal';

const Bar = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 14px',
  background: PRIMARY_LIGHT,
  borderBottom: `1px solid ${BORDER}`,
  fontSize: 14,
  flexWrap: 'wrap',
  [MOBILE]: { padding: '8px 12px', fontSize: 13 },
});

const Pulse = styled('span')({
  width: 8, height: 8, borderRadius: '50%', background: PRIMARY, flexShrink: 0,
  animation: 'yzPulse 1.6s ease-in-out infinite',
  '@keyframes yzPulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.25 } },
});

const Elapsed = styled('b')({
  fontVariantNumeric: 'tabular-nums',
  fontSize: 16,
  color: PRIMARY,
});

const What = styled('span')({
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1,
});

const Action = styled('button')({
  padding: '6px 14px',
  fontSize: 13,
  fontWeight: 600,
  color: '#fff',
  background: PRIMARY,
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'inherit',
  flexShrink: 0,
  '&:disabled': { opacity: 0.6, cursor: 'not-allowed' },
});

const GhostAction = styled(Action)({
  color: PRIMARY, background: '#fff', border: `1px solid ${BORDER}`,
});

/**
 * Sits above every /manage screen so a running timer is never out of sight —
 * the whole point is that people notice it before it runs all night.
 * Hidden entirely for anyone who does not report hours.
 */
export default function TimerBar() {
  const t = useTranslations(texts);
  const { user } = useManageAuth();
  const { timer, elapsedMinutes, stop } = useManageTimer();
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user?.tracksTime) return null;

  const onStop = async () => {
    setBusy(true);
    try { await stop(); } finally { setBusy(false); }
  };

  return (
    <>
      <Bar>
        {timer ? (
          <>
            <Pulse />
            <Elapsed>{formatClock(elapsedMinutes)}</Elapsed>
            <What>
              {t.categories[timer.category]}
              {refName(timer.projectId) ? ` · ${refName(timer.projectId)}` : ''}
            </What>
            <Action onClick={onStop} disabled={busy}>{t.stop}</Action>
          </>
        ) : (
          <>
            <What style={{ opacity: 0.65 }}>{t.noTimer}</What>
            <GhostAction onClick={() => setStarting(true)}>{t.startTimer}</GhostAction>
          </>
        )}
      </Bar>
      {starting && <StartTimerModal onClose={() => setStarting(false)} />}
    </>
  );
}
