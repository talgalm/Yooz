/**
 * CollageStation – full flow for the "Collage" station type.
 *
 * Phases:
 *   intro      → instructions screen with numbered photo-mission cards
 *   capture    → take / upload a photo for each mission
 *   review     → see all collected photos, set a title, then generate
 *   generating → animated progress bar (upload XHR progress + server-side ticker)
 *   result     → play the finished MP4 collage video, download or continue
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import type { StationItemData } from '../../pages/StoryModulePage/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CollageMission {
  title: string;
  description?: string;
}

interface CapturedPhoto {
  missionIndex: number;
  blob: Blob;
  previewUrl: string;
}

type Phase = 'intro' | 'capture' | 'review' | 'generating' | 'result';

interface Props {
  station: StationItemData;
  onContinue: () => void;
  code?: string;
}

// ─── Styled components ────────────────────────────────────────────────────────

const fadeIn = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`;

const Wrap = styled('div')({
  // position:fixed so CollageStation always fills the whole viewport,
  // regardless of which wrapper it is rendered inside (PlayingContent, NatureBackground, etc.)
  position: 'fixed',
  inset: 0,
  zIndex: 200,
  display: 'flex',
  flexDirection: 'column',
  background: 'linear-gradient(160deg,#12122a 0%,#1e1640 60%,#2a1045 100%)',
  color: '#fff',
  fontFamily: 'inherit',
  overflowY: 'auto',
  animation: `${fadeIn} 400ms ease both`,
});

const Content = styled('div')({ padding: '32px 20px 48px', display: 'flex', flexDirection: 'column' });

const TopLabel = styled('p')({ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4, marginTop: 0, letterSpacing: 1 });
const BigTitle = styled('h1')({ textAlign: 'center', fontSize: 26, fontWeight: 800, margin: '0 0 10px', lineHeight: 1.25 });
const SubText = styled('p')({ textAlign: 'center', fontSize: 15, color: 'rgba(255,255,255,0.72)', margin: '0 0 24px', lineHeight: 1.6 });

const MissionCard = styled('div')({
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16,
  padding: '14px 16px',
  marginBottom: 12,
  display: 'flex',
  alignItems: 'flex-start',
  gap: 14,
});
const MissionNum = styled('div')({
  width: 36, height: 36, borderRadius: 10,
  background: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontWeight: 800, fontSize: 16, flexShrink: 0,
});
const MissionInfo = styled('div')({ flex: 1 });
const MissionTitle = styled('div')({ fontWeight: 700, fontSize: 15 });
const MissionDesc = styled('div')({ fontSize: 13, color: 'rgba(255,255,255,0.58)', marginTop: 2 });

const PrimaryBtn = styled('button')({
  width: '100%', padding: 16, borderRadius: 14, border: 'none',
  background: 'linear-gradient(135deg,#f59e0b,#ec4899)',
  color: '#fff', fontSize: 17, fontWeight: 800, cursor: 'pointer',
  fontFamily: 'inherit', marginTop: 8,
  '&:disabled': { opacity: 0.45, cursor: 'not-allowed' },
});
const OutlineBtn = styled('button')({
  background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
  fontSize: 14, cursor: 'pointer', textDecoration: 'underline',
  padding: '8px 0', fontFamily: 'inherit', width: '100%', textAlign: 'center', marginTop: 4,
});

// Capture phase
const ProgressDots = styled('div')({ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 });
const Dot = styled('div')<{ active?: boolean; done?: boolean }>(({ active, done }) => ({
  width: 10, height: 10, borderRadius: '50%',
  background: done ? '#10b981' : active ? '#ec4899' : 'rgba(255,255,255,0.22)',
  transition: 'background 0.3s',
}));

const CaptureArea = styled('div')({
  width: '100%', aspectRatio: '3/4',
  background: 'rgba(0,0,0,0.45)',
  border: '2px dashed rgba(255,255,255,0.18)',
  borderRadius: 16, overflow: 'hidden', position: 'relative', marginBottom: 16,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
});
const CapturePreviewImg = styled('img')({ width: '100%', height: '100%', objectFit: 'cover' });
const CaptureVideo = styled('video')({ width: '100%', height: '100%', objectFit: 'cover' });
const PlaceholderIcon = styled('div')({ fontSize: 48, marginBottom: 8, opacity: 0.38 });
const PlaceholderText = styled('div')({ fontSize: 13, color: 'rgba(255,255,255,0.38)' });

const ButtonRow = styled('div')({ display: 'flex', gap: 10, marginBottom: 10 });
const HalfBtn = styled('button')({
  flex: 1, padding: '13px 8px', borderRadius: 12, border: 'none',
  background: 'rgba(255,255,255,0.09)', color: '#fff', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  '&:disabled': { opacity: 0.35, cursor: 'not-allowed' },
});
const GalleryBtn = styled('button')({
  width: '100%', padding: 12, borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.14)', background: 'transparent',
  color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14,
});

// Review phase
const ReviewItem = styled('div')({
  display: 'flex', gap: 12, alignItems: 'center',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12, padding: '10px 12px', marginBottom: 10,
});
const ReviewThumb = styled('img')({ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 });
const ReviewInfo = styled('div')({ flex: 1, minWidth: 0 });
const TitleInput = styled('input')({
  width: '100%', boxSizing: 'border-box', padding: '14px 16px',
  borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 16,
  fontFamily: 'inherit', marginBottom: 20, outline: 'none', textAlign: 'right',
  '&::placeholder': { color: 'rgba(255,255,255,0.32)' },
});

// Generating phase
const GeneratingWrap = styled('div')({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, minHeight: '100%' });
const GeneratingCard = styled('div')({
  width: '100%', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '32px 24px', textAlign: 'center',
});
const ProgressTrack = styled('div')({
  width: '100%', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden', marginBottom: 16,
});
const ProgressFill = styled('div')<{ pct: number }>(({ pct }) => ({
  height: '100%', width: `${pct}%`,
  background: 'linear-gradient(90deg,#8b5cf6,#ec4899)',
  borderRadius: 999, transition: 'width 0.35s ease',
}));
const ProgressLabel = styled('p')({ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 });
const ProgressSub = styled('p')({ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '6px 0 0' });

// Result phase
const VideoWrap = styled('div')({ borderRadius: 16, overflow: 'hidden', width: '100%', marginBottom: 20, background: '#000' });
const ResultVideo = styled('video')({ width: '100%', display: 'block' });

// ─── XHR upload with progress ─────────────────────────────────────────────────

function uploadCollageParts(
  photos: CapturedPhoto[],
  title: string,
  activityCode: string,
  onUploadProgress: (pct: number) => void, // 0-60
): Promise<{ url: string; isVideo: boolean }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('activityCode', activityCode);
    formData.append('title', title);
    photos.forEach((p, i) => {
      const ext = p.blob.type.includes('png') ? 'png' : 'jpg';
      formData.append('images', p.blob, `photo_${i}.${ext}`);
    });

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onUploadProgress(Math.round((e.loaded / e.total) * 60));
      }
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as { url: string; isVideo: boolean });
        } catch {
          reject(new Error('Invalid server response'));
        }
      } else {
        let msg = 'Server error';
        try { msg = (JSON.parse(xhr.responseText) as { error: string }).error || msg; } catch { /* */ }
        reject(new Error(msg));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.open('POST', '/api/collage/generate');
    xhr.send(formData);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CollageStation({ station, onContinue, code }: Props) {
  const settings = (station.settings ?? {}) as Record<string, unknown>;
  const header = (settings.header as string) || station.name || 'תחנת צילום';
  const description = (settings.description as string) || station.description || '';
  const rawMissions = settings.missions as CollageMission[] | undefined;
  const missions: CollageMission[] =
    Array.isArray(rawMissions) && rawMissions.length > 0
      ? rawMissions
      : [{ title: 'צלמו תמונה', description: '' }];

  const [phase, setPhase] = useState<Phase>('intro');
  const [currentMission, setCurrentMission] = useState(0);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [collageTitle, setCollageTitle] = useState(header);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('מעלה תמונות...');
  const [resultUrl, setResultUrl] = useState('');
  const [resultIsVideo, setResultIsVideo] = useState(false);
  const [error, setError] = useState('');

  // Capture state
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickCaptureRef = useRef<HTMLInputElement>(null);
  const serverTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Camera teardown ─────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => () => { stopCamera(); clearInterval(serverTickRef.current!); }, [stopCamera]);
  useEffect(() => { if (phase !== 'capture') stopCamera(); }, [phase, stopCamera]);

  // ── Camera helpers ──────────────────────────────────────────────────────────
  const handleActivateCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setCameraActive(true);
      setPreviewUrl('');
      setPreviewBlob(null);
    } catch {
      setError('לא ניתן לגשת למצלמה');
    }
  };

  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 1080;
    canvas.height = v.videoHeight || 1920;
    canvas.getContext('2d')!.drawImage(v, 0, 0);
    canvas.toBlob((b) => {
      if (!b) return;
      stopCamera();
      setPreviewUrl(URL.createObjectURL(b));
      setPreviewBlob(b);
    }, 'image/jpeg', 0.92);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    setPreviewUrl(URL.createObjectURL(file));
    setPreviewBlob(file);
    e.target.value = '';
  };

  // ── Capture navigation ──────────────────────────────────────────────────────
  const confirmPhoto = () => {
    if (!previewBlob || !previewUrl) return;
    const updated = [
      ...photos.filter((p) => p.missionIndex !== currentMission),
      { missionIndex: currentMission, blob: previewBlob, previewUrl },
    ].sort((a, b) => a.missionIndex - b.missionIndex);

    setPhotos(updated);
    stopCamera();
    setPreviewUrl('');
    setPreviewBlob(null);

    if (currentMission < missions.length - 1) {
      setCurrentMission((i) => i + 1);
    } else {
      setPhase('review');
    }
  };

  // ── Collage generation ──────────────────────────────────────────────────────
  const generateCollage = async () => {
    setPhase('generating');
    setProgress(0);
    setProgressLabel('מעלה תמונות...');
    setError('');

    // Simulate server-side processing progress (60→95%) while waiting for ffmpeg
    const startServerTick = () => {
      let cur = 60;
      serverTickRef.current = setInterval(() => {
        cur = Math.min(cur + Math.random() * 3, 94);
        setProgress(Math.round(cur));
        if (cur < 70) setProgressLabel('מעבד תמונות...');
        else if (cur < 82) setProgressLabel('יוצר סרטון...');
        else setProgressLabel('מוסיף מוזיקה...');
      }, 800);
    };

    try {
      const activityCode = code ?? '';
      const result = await uploadCollageParts(
        photos,
        collageTitle,
        activityCode,
        (uploadPct) => {
          setProgress(uploadPct);
          if (uploadPct >= 60) {
            // Upload done — start fake server progress tick
            clearInterval(serverTickRef.current!);
            startServerTick();
          }
        },
      );

      clearInterval(serverTickRef.current!);
      setProgress(100);
      setProgressLabel('הסרטון מוכן!');

      await new Promise((r) => setTimeout(r, 500));

      setResultUrl(result.url);
      setResultIsVideo(result.isVideo ?? false);
      setPhase('result');
    } catch (err) {
      clearInterval(serverTickRef.current!);
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת הסרטון');
      setPhase('review');
    }
  };

  // ── Download ────────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    try {
      const a = document.createElement('a');
      if (resultUrl.startsWith('blob:')) {
        a.href = resultUrl;
      } else {
        const res = await fetch(resultUrl);
        a.href = URL.createObjectURL(await res.blob());
      }
      a.download = `${collageTitle || 'collage'}.${resultIsVideo ? 'mp4' : 'png'}`;
      a.click();
    } catch { /* user can long-press to save */ }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const currentPhotoForMission = photos.find((p) => p.missionIndex === currentMission);
  const displayUrl = previewUrl || currentPhotoForMission?.previewUrl || '';
  const hasCapture = !!(previewUrl || currentPhotoForMission);

  // ════════════════════════════════════════════════════════════════════════════
  // INTRO
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'intro') {
    return (
      <Wrap>
        <Content>
          <TopLabel>תחנת צילום</TopLabel>
          <BigTitle>{header}</BigTitle>
          {description && <SubText>{description}</SubText>}

          {missions.map((m, i) => (
            <MissionCard key={i}>
              <MissionNum>{i + 1}</MissionNum>
              <MissionInfo>
                <MissionTitle>{m.title}</MissionTitle>
                {m.description && <MissionDesc>{m.description}</MissionDesc>}
              </MissionInfo>
            </MissionCard>
          ))}

          <div style={{ marginTop: 16 }}>
            <PrimaryBtn onClick={() => { setCurrentMission(0); setPhotos([]); setPreviewUrl(''); setPreviewBlob(null); setPhase('capture'); }}>
              מתחילים לצלם 📷
            </PrimaryBtn>
            <OutlineBtn onClick={onContinue}>דלג על התחנה הזו</OutlineBtn>
          </div>
        </Content>
      </Wrap>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CAPTURE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'capture') {
    const mission = missions[currentMission];
    return (
      <Wrap>
        <Content>
          <TopLabel>צילום {currentMission + 1} מתוך {missions.length}</TopLabel>
          <BigTitle style={{ fontSize: 22 }}>{mission.title}</BigTitle>
          {mission.description && <SubText style={{ marginBottom: 14 }}>{mission.description}</SubText>}

          <ProgressDots>
            {missions.map((_, i) => (
              <Dot key={i}
                active={i === currentMission}
                done={i < currentMission || !!photos.find((p) => p.missionIndex === i)}
              />
            ))}
          </ProgressDots>

          <CaptureArea>
            {cameraActive && !previewUrl
              ? <CaptureVideo ref={videoRef} muted playsInline autoPlay />
              : displayUrl
                ? <CapturePreviewImg src={displayUrl} alt="preview" />
                : <><PlaceholderIcon>🖼</PlaceholderIcon><PlaceholderText>הדליקו מצלמה או העלו תמונה</PlaceholderText></>
            }
          </CaptureArea>

          {error && <p style={{ color: '#f87171', textAlign: 'center', fontSize: 13, marginBottom: 8 }}>{error}</p>}

          {cameraActive && !previewUrl ? (
            <PrimaryBtn onClick={handleTakePhoto} style={{ marginBottom: 10 }}>📸 צלם עכשיו</PrimaryBtn>
          ) : (
            <>
              <ButtonRow>
                <HalfBtn onClick={() => quickCaptureRef.current?.click()}>📷 צילום ברגע</HalfBtn>
                <HalfBtn onClick={handleActivateCamera}>🎥 הפעלת מצלמה</HalfBtn>
              </ButtonRow>
              <GalleryBtn onClick={() => fileInputRef.current?.click()}>🖼 העלאה מהגלריה</GalleryBtn>
            </>
          )}

          {previewUrl && <OutlineBtn onClick={() => { stopCamera(); setPreviewUrl(''); setPreviewBlob(null); }} style={{ marginBottom: 8 }}>צלם מחדש</OutlineBtn>}

          <PrimaryBtn onClick={confirmPhoto} disabled={!hasCapture}>אישור תמונה והמשך</PrimaryBtn>

          <input ref={quickCaptureRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileSelected} />
          <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileSelected} />
        </Content>
      </Wrap>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REVIEW
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'review') {
    return (
      <Wrap>
        <Content>
          <TopLabel>תחנת קולאז׳</TopLabel>
          <BigTitle>יש לנו {photos.length} תמונות 🎉</BigTitle>
          <SubText>תנו לסרטון כותרת ולחצו על יצירת סרטון קולאז׳.</SubText>

          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.48)', marginBottom: 6 }}>כותרת הסרטון</p>
          <TitleInput value={collageTitle} onChange={(e) => setCollageTitle(e.target.value)} placeholder="הרגעים שלנו יחד" dir="rtl" />

          {photos.map((photo, i) => {
            const mission = missions[photo.missionIndex];
            return (
              <ReviewItem key={i}>
                <ReviewThumb src={photo.previewUrl} alt="" />
                <ReviewInfo>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{mission?.title ?? `תמונה ${i + 1}`}</div>
                  {mission?.description && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{mission.description}</div>}
                </ReviewInfo>
                <span style={{ fontSize: 20 }}>📷</span>
              </ReviewItem>
            );
          })}

          {error && <p style={{ color: '#f87171', textAlign: 'center', fontSize: 13, margin: '8px 0' }}>{error}</p>}

          <PrimaryBtn onClick={generateCollage} style={{ marginTop: 12 }}>יצירת סרטון קולאז׳ 🎬</PrimaryBtn>
          <OutlineBtn onClick={() => { setPhase('capture'); setCurrentMission(missions.length - 1); }}>חזרה לצילום</OutlineBtn>
        </Content>
      </Wrap>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GENERATING
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'generating') {
    return (
      <Wrap>
        <GeneratingWrap>
          <GeneratingCard>
            <ProgressTrack><ProgressFill pct={progress} /></ProgressTrack>
            <ProgressLabel>יוצר קולאז׳... {progress}%</ProgressLabel>
            <ProgressSub>{progressLabel}</ProgressSub>
          </GeneratingCard>
        </GeneratingWrap>
      </Wrap>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RESULT
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'result') {
    return (
      <Wrap>
        <Content>
          <TopLabel>תחנת קולאז׳</TopLabel>
          <BigTitle>הסרטון מוכן! 🎉</BigTitle>

          <VideoWrap>
            {resultIsVideo
              ? <ResultVideo src={resultUrl} controls autoPlay playsInline loop />
              : <img src={resultUrl} alt="collage" style={{ width: '100%', display: 'block' }} />
            }
          </VideoWrap>

          <PrimaryBtn onClick={handleDownload}>הורידו את הסרטון ⬇️</PrimaryBtn>
          <OutlineBtn onClick={onContinue} style={{ color: '#f87171', marginTop: 8 }}>חזרה לפעילות</OutlineBtn>
        </Content>
      </Wrap>
    );
  }

  return null;
}
