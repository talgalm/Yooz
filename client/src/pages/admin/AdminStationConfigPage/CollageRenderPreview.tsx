import { useEffect, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { adminApiFetch } from '../../../utils/adminApi';
import type { CollageTemplateId, CustomCollageVideo } from '../../../utils/collageVideo';
import { texts } from './CollageEditor.i18n';

const PURPLE = '#6C5CE7';
const POLL_MS = 2000;

const Box = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 14,
  borderRadius: 12,
  border: '1px solid #e6e2f2',
  background: '#faf9ff',
});
const Title = styled('div')({ fontSize: 14, fontWeight: 700, color: '#2d2540' });
const Hint = styled('div')({ fontSize: 12, color: '#888' });
const Button = styled('button')({
  alignSelf: 'flex-start',
  border: 'none',
  borderRadius: 8,
  padding: '9px 16px',
  background: PURPLE,
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  '&:disabled': { opacity: 0.45, cursor: 'default' },
});
const Bar = styled('div')({ height: 8, borderRadius: 4, background: '#e6e1f5', overflow: 'hidden' });
const Fill = styled('div')({ height: '100%', background: PURPLE, transition: 'width 0.4s ease-out' });
const Status = styled('div')({ fontSize: 13, color: '#2d2540' });
const Failure = styled('div')({ fontSize: 13, fontWeight: 600, color: '#c0392b' });
const Result = styled('video')({ alignSelf: 'center', maxWidth: '100%', maxHeight: 420, borderRadius: 12, background: '#000' });

interface Progress {
  phase: string;
  percent: number;
  error?: string;
  resultUrl?: string;
}

export interface CollagePreviewRequest {
  template: CollageTemplateId;
  photoCount: number;
  customVideo?: CustomCollageVideo;
  logoUrl?: string;
  logoRightUrl?: string;
}

interface Props {
  request: CollagePreviewRequest;
  blocked: boolean;
}

export default function CollageRenderPreview({ request, blocked }: Props) {
  const t = useTranslations(texts);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [startError, setStartError] = useState('');
  const pollTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/collage/progress/${encodeURIComponent(jobId)}`, { cache: 'no-store' });
        const data = (await res.json()) as Progress;
        if (!alive) return;
        setProgress(data);
        if (data.phase === 'done' || data.phase === 'error') return;
      } catch {
        if (!alive) return;
      }
      pollTimer.current = window.setTimeout(poll, POLL_MS);
    };
    void poll();
    return () => {
      alive = false;
      if (pollTimer.current) window.clearTimeout(pollTimer.current);
    };
  }, [jobId]);

  const working = !!jobId && progress?.phase !== 'done' && progress?.phase !== 'error';

  const start = async () => {
    setStartError('');
    setProgress(null);
    setJobId(null);
    try {
      const data = await adminApiFetch<{ jobId: string }>('/api/collage/admin-preview', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      setJobId(data.jobId);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : t.renderFailed);
    }
  };

  return (
    <Box>
      <Title>{t.renderTitle}</Title>
      {blocked && <Hint>{t.renderNeedsVideo}</Hint>}
      <Button type="button" onClick={() => void start()} disabled={blocked || working}>
        {progress?.phase === 'done' ? t.renderAgain : t.renderButton}
      </Button>
      {working && (
        <>
          <Status>{t.renderWorking(Math.round(progress?.percent ?? 0))}</Status>
          <Bar><Fill style={{ width: `${Math.max(3, progress?.percent ?? 0)}%` }} /></Bar>
        </>
      )}
      {(startError || progress?.phase === 'error') && (
        <Failure>{`${t.renderFailed}${startError || progress?.error ? `: ${startError || progress?.error}` : ''}`}</Failure>
      )}
      {progress?.phase === 'done' && progress.resultUrl && <Result src={progress.resultUrl} controls playsInline />}
    </Box>
  );
}
