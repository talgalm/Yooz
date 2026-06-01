import { useState, useEffect, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminTutorialsTab.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import {
  PrimaryButton,
  Input,
  ErrorText,
} from '../../../components/styled';
import {
  PageTitle,
  SectionLabel,
} from '../styled';

// ─── Types ───

interface TutorialStep {
  name: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  startedAt?: string;
  completedAt?: string;
  detail?: string;
}

interface Tutorial {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  steps?: TutorialStep[];
  startedAt?: string;
  createdAt: string;
}

// ─── Styled ───

const Container = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
});

const GenerateForm = styled('div')({
  display: 'flex',
  gap: 12,
  alignItems: 'flex-end',
  flexWrap: 'wrap',
  padding: '20px 24px',
  borderRadius: 16,
  border: '1px solid #ececf4',
  background: '#fff',
});

const FormField = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  flex: 1,
  minWidth: 0,
  '@media (min-width: 601px)': {
    minWidth: 200,
  },
});

const TextArea = styled('textarea')({
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid #e8e8ec',
  fontSize: 14,
  fontFamily: 'inherit',
  background: '#fafafa',
  resize: 'vertical',
  minHeight: 80,
  boxSizing: 'border-box',
  '&:focus': {
    outline: 'none',
    borderColor: '#6c5ce7',
    background: '#fff',
  },
});

const VideoGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: 16,
  '@media (max-width: 600px)': {
    gridTemplateColumns: '1fr',
  },
});

const VideoCard = styled('div')({
  borderRadius: 14,
  border: '1px solid #ececf4',
  background: '#fff',
  overflow: 'hidden',
  transition: 'box-shadow 0.2s',
  '&:hover': {
    boxShadow: '0 4px 16px rgba(108,92,231,0.1)',
  },
});

const VideoPreview = styled('div')({
  position: 'relative',
  width: '100%',
  aspectRatio: '16/9',
  background: '#f0f0f4',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
});

const VideoElement = styled('video')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

const CardBody = styled('div')({
  padding: '12px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

const CardTitle = styled('div')({
  fontWeight: 600,
  fontSize: 15,
  color: '#333',
});

const CardDescription = styled('div')({
  fontSize: 13,
  color: '#666',
  lineHeight: 1.4,
});

const CardMeta = styled('div')({
  fontSize: 12,
  color: '#999',
});

const CardActions = styled('div')({
  display: 'flex',
  gap: 8,
  marginTop: 4,
});

const ActionButton = styled('button')<{ variant?: 'danger' }>(({ variant }) => ({
  padding: '6px 14px',
  borderRadius: 8,
  border: `1px solid ${variant === 'danger' ? '#e74c3c' : '#6c5ce7'}`,
  background: 'transparent',
  color: variant === 'danger' ? '#e74c3c' : '#6c5ce7',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s',
  '&:hover': {
    background: variant === 'danger' ? '#fdeaea' : '#f5f0ff',
  },
}));

const Spinner = styled('div')({
  width: 40,
  height: 40,
  border: '4px solid #e8e8ec',
  borderTop: '4px solid #6c5ce7',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  '@keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
});

const StatusBadge = styled('span')<{ status: string }>(({ status }) => ({
  display: 'inline-block',
  padding: '3px 10px',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 6,
  background: status === 'ready' ? '#e8f5e9' : status === 'failed' ? '#fdeaea' : '#fff3e0',
  color: status === 'ready' ? '#2e7d32' : status === 'failed' ? '#e74c3c' : '#e65100',
}));

const EmptyState = styled('div')({
  padding: '48px 16px',
  textAlign: 'center',
  color: '#aaa',
  fontSize: 15,
});

const ProgressOverlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const ProgressCard = styled('div')({
  background: '#fff',
  borderRadius: 18,
  padding: '28px 32px',
  minWidth: 340,
  maxWidth: 420,
  boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
});

const ProgressHeader = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const ProgressTitle = styled('div')({
  fontWeight: 700,
  fontSize: 17,
  color: '#333',
});

const ElapsedTime = styled('div')({
  fontSize: 13,
  color: '#888',
  fontVariantNumeric: 'tabular-nums',
});

const StepList = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

const StepRow = styled('div')<{ stepStatus: string }>(({ stepStatus }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 14px',
  borderRadius: 12,
  background: stepStatus === 'running' ? '#f5f0ff' : stepStatus === 'done' ? '#e8f5e9' : stepStatus === 'failed' ? '#fdeaea' : '#fafafa',
  transition: 'background 0.3s',
}));

const StepIcon = styled('div')<{ stepStatus: string }>(({ stepStatus }) => ({
  width: 28,
  height: 28,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  fontWeight: 700,
  flexShrink: 0,
  ...(stepStatus === 'done' ? { background: '#4caf50', color: '#fff' } :
     stepStatus === 'running' ? { background: '#6c5ce7', color: '#fff', animation: 'pulse 1.5s infinite' } :
     stepStatus === 'failed' ? { background: '#e74c3c', color: '#fff' } :
     { background: '#e8e8ec', color: '#aaa' }),
  '@keyframes pulse': {
    '0%, 100%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.15)' },
  },
}));

const StepInfo = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
});

const StepName = styled('div')({
  fontSize: 14,
  fontWeight: 600,
  color: '#333',
});

const StepDetail = styled('div')({
  fontSize: 12,
  color: '#888',
});

const CloseButton = styled('button')({
  padding: '8px 20px',
  borderRadius: 10,
  border: '1px solid #e8e8ec',
  background: '#fff',
  color: '#666',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  alignSelf: 'center',
  '&:hover': { background: '#f5f5f5' },
});

// ─── Helpers ───

function formatElapsed(startedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function stepIcon(status: string): string {
  if (status === 'done') return '\u2713';
  if (status === 'running') return '\u25B6';
  if (status === 'failed') return '\u2717';
  return '\u2022';
}

// ─── Component ───

export default function AdminTutorialsTab() {
  const t = useTranslations(texts);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progressId, setProgressId] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<{ steps: TutorialStep[]; startedAt?: string; status: string; error?: string } | null>(null);
  const [elapsed, setElapsed] = useState('0:00');

  const fetchTutorials = useCallback(async () => {
    try {
      const data = await adminApiFetch<{ tutorials: Tutorial[] }>('/api/admin/tutorials');
      setTutorials(data.tutorials);
    } catch {}
  }, []);

  useEffect(() => {
    fetchTutorials();
  }, [fetchTutorials]);

  // Poll for pending/generating tutorials
  useEffect(() => {
    const hasPending = tutorials.some((tut) => tut.status === 'pending' || tut.status === 'generating');
    if (!hasPending) return;

    const interval = setInterval(fetchTutorials, 5000);
    return () => clearInterval(interval);
  }, [tutorials, fetchTutorials]);

  // Poll progress for selected tutorial
  useEffect(() => {
    if (!progressId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await adminApiFetch<{ steps: TutorialStep[]; startedAt?: string; status: string; error?: string }>(`/api/admin/tutorials/${progressId}/progress`);
        if (!cancelled) setProgressData(data);
        // Auto-close if done or failed + refresh list
        if (data.status === 'ready' || data.status === 'failed') {
          fetchTutorials();
        }
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [progressId, fetchTutorials]);

  // Update elapsed timer
  useEffect(() => {
    if (!progressId || !progressData?.startedAt) return;
    if (progressData.status === 'ready' || progressData.status === 'failed') {
      setElapsed(formatElapsed(progressData.startedAt));
      return;
    }
    const timer = setInterval(() => setElapsed(formatElapsed(progressData.startedAt!)), 1000);
    return () => clearInterval(timer);
  }, [progressId, progressData?.startedAt, progressData?.status]);

  const handleGenerate = async () => {
    if (!title.trim() || !description.trim()) return;
    setError('');
    setLoading(true);
    try {
      await adminApiFetch('/api/admin/tutorials/generate', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      setTitle('');
      setDescription('');
      await fetchTutorials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;
    try {
      await adminApiFetch(`/api/admin/tutorials/${id}`, { method: 'DELETE' });
      await fetchTutorials();
    } catch {}
  };

  return (
    <Container>
      <PageTitle>{t.title}</PageTitle>

      {/* Generate form */}
      <GenerateForm>
        <FormField>
          <SectionLabel>{t.videoTitle}</SectionLabel>
          <Input
            placeholder={t.titlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </FormField>

        <FormField style={{ flex: 2 }}>
          <SectionLabel>{t.videoDescription}</SectionLabel>
          <TextArea
            placeholder={t.descriptionPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>

        <PrimaryButton
          onClick={handleGenerate}
          disabled={loading || !title.trim() || !description.trim()}
          style={{ height: 42, whiteSpace: 'nowrap' }}
        >
          {loading ? t.generating : t.generate}
        </PrimaryButton>
      </GenerateForm>

      {error && <ErrorText>{error}</ErrorText>}

      {/* Video grid */}
      {tutorials.length === 0 ? (
        <EmptyState>{t.noVideos}</EmptyState>
      ) : (
        <VideoGrid>
          {tutorials.map((tutorial) => (
            <VideoCard key={tutorial._id}>
              <VideoPreview>
                {tutorial.status === 'ready' && tutorial.videoUrl ? (
                  <VideoElement controls preload="metadata">
                    <source src={tutorial.videoUrl} type="video/mp4" />
                  </VideoElement>
                ) : tutorial.status === 'failed' ? (
                  <div style={{ textAlign: 'center', color: '#e74c3c', padding: 16 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
                    <div style={{ fontSize: 13 }}>{tutorial.error?.slice(0, 100)}</div>
                  </div>
                ) : (
                  <div
                    onClick={() => { setProgressId(tutorial._id); setProgressData(null); }}
                    style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
                    title={t.progressTitle}
                  >
                    <Spinner />
                    <span style={{ fontSize: 12, color: '#6c5ce7', fontWeight: 600 }}>{t.statusGenerating}</span>
                  </div>
                )}
              </VideoPreview>

              <CardBody>
                <CardTitle>{tutorial.title}</CardTitle>
                {tutorial.description && (
                  <CardDescription>{tutorial.description}</CardDescription>
                )}
                <CardMeta>
                  {new Date(tutorial.createdAt).toLocaleDateString('he-IL')} &middot;{' '}
                  <StatusBadge status={tutorial.status}>{
                    tutorial.status === 'ready' ? '✓' :
                    tutorial.status === 'failed' ? t.statusFailed :
                    t.statusGenerating
                  }</StatusBadge>
                </CardMeta>

                <CardActions>
                  {tutorial.status === 'ready' && tutorial.videoUrl && (
                    <ActionButton
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = tutorial.videoUrl!;
                        a.download = `${tutorial.title}.mp4`;
                        a.click();
                      }}
                    >
                      {t.download}
                    </ActionButton>
                  )}
                  <ActionButton variant="danger" onClick={() => handleDelete(tutorial._id)}>
                    {t.delete}
                  </ActionButton>
                </CardActions>
              </CardBody>
            </VideoCard>
          ))}
        </VideoGrid>
      )}
      {/* Progress popup */}
      {progressId && progressData && (
        <ProgressOverlay onClick={() => setProgressId(null)}>
          <ProgressCard onClick={(e) => e.stopPropagation()}>
            <ProgressHeader>
              <ProgressTitle>{t.progressTitle}</ProgressTitle>
              <ElapsedTime>{t.elapsed}: {elapsed}</ElapsedTime>
            </ProgressHeader>

            <StepList>
              {progressData.steps.map((step, i) => (
                <StepRow key={i} stepStatus={step.status}>
                  <StepIcon stepStatus={step.status}>{stepIcon(step.status)}</StepIcon>
                  <StepInfo>
                    <StepName>{step.name}</StepName>
                    <StepDetail>
                      {step.status === 'done' ? t.stepDone :
                       step.status === 'running' ? t.stepRunning :
                       step.status === 'failed' ? t.stepFailed :
                       t.stepPending}
                      {step.detail ? ` — ${step.detail}` : ''}
                    </StepDetail>
                  </StepInfo>
                </StepRow>
              ))}
            </StepList>

            {progressData.error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fdeaea', fontSize: 13, color: '#c0392b', lineHeight: 1.5 }}>
                {progressData.error.slice(0, 200)}
              </div>
            )}

            <CloseButton onClick={() => setProgressId(null)}>{t.close}</CloseButton>
          </ProgressCard>
        </ProgressOverlay>
      )}
    </Container>
  );
}
