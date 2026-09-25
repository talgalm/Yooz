
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import type { StationItemData } from '../../pages/StoryModulePage/types';
import {
  buildVideoSharePlainText,
  buildVideoShareTextBody,
} from '../../utils/ganeiYehoshuaShareText';
import { useLang, useTranslations } from '../../context/LanguageContext';
import { currentLang } from '../../utils/currentLang';
import { texts } from './CollageStation.i18n';
import {
  saveCollagePart,
  loadCollageParts,
  clearCollageParts,
  markCollageSkipped,
  isCollageSkipped,
  clearCollageSkipped,
} from './collageSplitStorage';
import {
  startBackgroundCollage,
  getBackgroundCollage,
  subscribeBackgroundCollage,
  consumeBackgroundCollage,
  uploadSplitPhotosInBackground,
  getCompletedCollageResult,
  waitForServerCollageJob,
  cleanupCollageJobPersistence,
  makeSplitCollageJobId,
  findCollageJob,
} from './backgroundCollageJob';
import { fetchCollageProgress } from '../../utils/collageApi';
import { useAuth } from '../../context/AuthContext';
import { participantSessionId } from '../../utils/participantActivity';

interface CollageMission {
  title: string;
  description?: string;
  referenceImageUrl?: string;
}

interface CapturedPhoto {
  missionIndex: number;
  blob: Blob;
  previewUrl: string;
  isVideo?: boolean;
}

type Phase = 'intro' | 'capture' | 'review' | 'generating' | 'result';

interface Props {
  station: StationItemData;
  onContinue: () => void;
  code?: string;
  smsForCollage?: boolean;
}

function serverWording(message: string | undefined): boolean {
  return Boolean(message) && currentLang() === 'he';
}

const fadeIn = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`;

const Wrap = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 200,
  display: 'flex',
  flexDirection: 'column',
  background: 'linear-gradient(160deg,#12122a 0%,#1e1640 60%,#2a1045 100%)',
  color: '#fff',
  fontFamily: 'inherit',
  overflow: 'hidden',
  height: '100dvh',
  maxHeight: '100dvh',
  animation: `${fadeIn} 400ms ease both`,
});

const Content = styled('div')({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
  display: 'flex',
  flexDirection: 'column',
  WebkitOverflowScrolling: 'touch',
  '@media (min-width: 768px)': {
    width: 'min(720px, 90vw)',
    marginInline: 'auto',
    padding: '40px 24px calc(40px + env(safe-area-inset-bottom, 0px))',
  },
});

const CaptureLayout = styled('div')({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  padding: '10px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
  maxWidth: 480,
  width: '100%',
  margin: '0 auto',
  boxSizing: 'border-box',
  '@media (min-width: 768px)': {
    maxWidth: 'min(640px, 80vw)',
    padding: '24px 24px calc(24px + env(safe-area-inset-bottom, 0px))',
    justifyContent: 'center',
  },
});

const CaptureHeader = styled('div')({ flexShrink: 0, textAlign: 'center' });
const CaptureActions = styled('div')({ flexShrink: 0, marginTop: 'auto', paddingTop: 8 });

const TopLabel = styled('p')({ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4, marginTop: 0, letterSpacing: 1 });
const BigTitle = styled('h1')({ textAlign: 'center', fontSize: 26, fontWeight: 800, margin: '0 0 18px', lineHeight: 1.25 });
const SubText = styled('p')({ textAlign: 'center', fontSize: 15, color: 'rgba(255,255,255,0.72)', margin: '0 0 24px', lineHeight: 1.6 });

const DisclaimerCard = styled('div')({
  alignSelf: 'stretch',
  background: '#fff',
  color: '#1a143f',
  borderRadius: 20,
  padding: '22px 20px',
  margin: '4px 0 20px',
  textAlign: 'center',
  fontWeight: 800,
  fontSize: 17,
  lineHeight: 1.45,
  boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
  whiteSpace: 'pre-line',
});

const CompactDisclaimer = styled('div')({
  alignSelf: 'stretch',
  background: 'rgba(255,255,255,0.14)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.26)',
  borderRadius: 12,
  padding: '8px 10px',
  margin: '0 0 10px',
  textAlign: 'center',
  fontWeight: 700,
  fontSize: 13,
  lineHeight: 1.4,
  whiteSpace: 'pre-line',
});

const PartBadge = styled('div')({
  textAlign: 'center',
  fontSize: 14,
  fontWeight: 700,
  color: '#fde68a',
  margin: '0 0 18px',
});

const MissionCard = styled('div')({
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 18,
  padding: '14px 16px',
  marginBottom: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 14,
});
const MissionNum = styled('div')({
  width: 36, height: 36, borderRadius: '50%',
  background: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontWeight: 800, fontSize: 16, flexShrink: 0, color: '#fff',
});
const MissionInfo = styled('div')({ flex: 1, textAlign: 'start' });
const MissionTitle = styled('div')({ fontWeight: 800, fontSize: 16, color: '#fff' });
const MissionDesc = styled('div')({ fontSize: 13, color: 'rgba(255,255,255,0.62)', marginTop: 3 });

const PrimaryBtn = styled('button')({
  width: '100%', padding: '18px 16px', borderRadius: 18, border: 'none',
  background: 'linear-gradient(135deg,#f7a060,#ec5e9c)',
  color: '#fff', fontSize: 18, fontWeight: 800, cursor: 'pointer',
  fontFamily: 'inherit', marginTop: 12,
  boxShadow: '0 10px 24px rgba(236,94,156,0.35)',
  '&:disabled': { opacity: 0.45, cursor: 'not-allowed' },
});
const OutlineBtn = styled('button')({
  background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
  fontSize: 14, cursor: 'pointer', textDecoration: 'underline',
  padding: '8px 0', fontFamily: 'inherit', width: '100%', textAlign: 'center', marginTop: 4,
});

const ProgressDots = styled('div')({ display: 'flex', gap: 6, justifyContent: 'center', margin: '6px 0 8px' });
const Dot = styled('div')<{ active?: boolean; done?: boolean }>(({ active, done }) => ({
  width: 8, height: 8, borderRadius: '50%',
  background: done ? '#10b981' : active ? '#ec4899' : 'rgba(255,255,255,0.22)',
  transition: 'background 0.3s',
}));

const CaptureArea = styled('div')({
  flex: '1 1 0',
  minHeight: 80,
  width: 'min(100%, 280px)',
  maxWidth: '100%',
  maxHeight: '100%',
  aspectRatio: '3 / 4',
  alignSelf: 'center',
  background: 'rgba(0,0,0,0.45)',
  border: '2px dashed rgba(255,255,255,0.18)',
  borderRadius: 14,
  overflow: 'hidden',
  position: 'relative',
  margin: '0 auto 8px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  '@media (min-width: 768px)': {
    width: 'min(380px, 60vw)',
    margin: '12px auto 16px',
  },
});
const CapturePreviewImg = styled('img')({ width: '100%', height: '100%', objectFit: 'cover' });
const ReferenceImg = styled('img')({
  position: 'absolute', inset: 0, width: '100%', height: '100%',
  objectFit: 'cover', opacity: 0.7, pointerEvents: 'none',
});
const PlaceholderIcon = styled('div')({ fontSize: 56, marginBottom: 12, opacity: 0.55, position: 'relative' });
const PlaceholderText = styled('div')({ fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,0.78)', lineHeight: 1.4, position: 'relative' });

const ButtonRow = styled('div')({ display: 'flex', gap: 8, marginBottom: 6 });
const HalfBtn = styled('button')({
  flex: 1, padding: '14px 10px', borderRadius: 12, border: 'none',
  background: 'rgba(255,255,255,0.09)', color: '#fff', fontSize: 15, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  '&:disabled': { opacity: 0.35, cursor: 'not-allowed' },
});

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
  fontFamily: 'inherit', marginBottom: 20, outline: 'none', textAlign: 'start',
  '&::placeholder': { color: 'rgba(255,255,255,0.32)' },
});

const GeneratingWrap = styled('div')({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, minHeight: '100%' });
const GeneratingCard = styled('div')({
  width: '100%', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '28px 24px 32px', textAlign: 'center',
});
const GeneratingIntro = styled('p')({
  fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.88)',
  margin: '0 0 16px', lineHeight: 1.45, textAlign: 'center',
});
const LoadingGif = styled('img')({
  width: 180, height: 180, objectFit: 'contain',
  margin: '0 auto 18px', display: 'block',
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
const ProgressEta = styled('p')({ fontSize: 12, color: 'rgba(255,255,255,0.42)', margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' });
const ProgressOffline = styled('p')({ fontSize: 12, color: '#fde68a', margin: '8px 0 0', fontWeight: 700 });

const smsPulse = keyframes`
  0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(236,94,156,0.55), 0 10px 24px rgba(236,94,156,0.35); }
  50%      { transform: scale(1.05); box-shadow: 0 0 0 14px rgba(236,94,156,0), 0 10px 28px rgba(236,94,156,0.5); }
`;
const smsHintBounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(4px); }
`;
const SmsCalloutHint = styled('p')({
  fontSize: 14, fontWeight: 800, color: '#fde68a',
  margin: '20px 0 10px', textAlign: 'center', lineHeight: 1.4,
  animation: `${smsHintBounce} 1.6s ease-in-out infinite`,
});
const SmsCalloutBtn = styled('button')({
  width: '100%', padding: '16px 18px', borderRadius: 999, border: 'none',
  background: 'linear-gradient(135deg,#f7a060,#ec5e9c)',
  color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
  animation: `${smsPulse} 1.6s ease-in-out infinite`,
  '&:disabled': { opacity: 0.6, cursor: 'wait', animation: 'none' },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
});

const VideoWrap = styled('div')({ borderRadius: 16, overflow: 'hidden', width: '100%', marginBottom: 20, background: '#000', position: 'relative' });
const ResultVideo = styled('video')({ width: '100%', display: 'block' });
const VideoPlayOverlay = styled('button')({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.35)',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
});
const VideoPlayIcon = styled('span')({
  width: 72,
  height: 72,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.92)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 32,
  color: '#1a143f',
  paddingLeft: 6,
});

export default function CollageStation({ station, onContinue, code, smsForCollage }: Props) {
  const t = useTranslations(texts);
  const { lang } = useLang();
  const { participant } = useAuth();
  const userTag = participantSessionId();
  const splitGroupId = station.collageSplit
    ? `${station.collageSplit.splitGroupId}_${userTag}`
    : '';
  const singleGroupId = `single_${station._id}_${userTag}`;

  const settings = (station.settings ?? {}) as Record<string, unknown>;
  const header = (settings.header as string) || station.name || t.stationName;
  const description = (settings.description as string) || station.description || '';
  const disclaimer = (settings.disclaimer as string) || '';
  const logoUrl = (settings.logoUrl as string) || '';
  const logoRightUrl = (settings.logoRightUrl as string) || '';
  const template = (settings.template as string) || 'default';
  const multiSelect = !!settings.multiSelect;
  const multiSelectCount = typeof settings.multiSelectCount === 'number' && settings.multiSelectCount > 0
    ? (settings.multiSelectCount as number)
    : 1;
  const rawMissions = settings.missions as CollageMission[] | undefined;
  const baseMissions: CollageMission[] = multiSelect
    ? Array.from({ length: multiSelectCount }, (_, i) => ({ title: t.itemLabel(i + 1), description: '' }))
    : (Array.isArray(rawMissions) && rawMissions.length > 0
        ? rawMissions
        : [{ title: t.takePhoto, description: '' }]);

  const splitMeta = station.collageSplit;
  const fullMissions: CollageMission[] =
    splitMeta?.photoOrder && splitMeta.photoOrder.length === baseMissions.length
      ? splitMeta.photoOrder.map((i) => baseMissions[i] ?? baseMissions[0])
      : baseMissions;
  const totalImages = fullMissions.length;
  const videoPartIndex = splitMeta?.videoPartIndex ?? null;
  const hasVideoPart = typeof videoPartIndex === 'number' && videoPartIndex >= 0;
  const partSizes: number[] = (() => {
    const distributeEvenly = (total: number, parts: number) => {
      const base = Math.floor(total / parts);
      const extras = total % parts;
      return Array.from({ length: parts }, (_, i) => Math.max(1, base + (i < extras ? 1 : 0)));
    };
    if (splitMeta?.partSizes && splitMeta.partSizes.length > 0) {
      const sum = splitMeta.partSizes.reduce((a, b) => a + b, 0);
      if (sum === totalImages) return splitMeta.partSizes;
      if (hasVideoPart) {
        const photoParts = splitMeta.partSizes.length - 1;
        const photoSizes = distributeEvenly(totalImages, Math.max(1, photoParts));
        const repaired = [...splitMeta.partSizes];
        let pi = 0;
        for (let i = 0; i < repaired.length; i++) {
          if (i === videoPartIndex) { repaired[i] = 0; continue; }
          repaired[i] = photoSizes[pi++] ?? 1;
        }
        return repaired;
      }
      return distributeEvenly(totalImages, splitMeta.partSizes.length);
    }
    const n = splitMeta?.totalParts && splitMeta.totalParts > 0 ? splitMeta.totalParts : 1;
    return distributeEvenly(totalImages, n);
  })();
  const totalParts = partSizes.length;
  const partIndex = Math.min(splitMeta?.partIndex ?? 0, totalParts - 1);
  const isSplit = totalParts > 1;
  const isFirstPart = partIndex === 0;
  const isLastPart = partIndex === totalParts - 1;
  const isVideoPart = hasVideoPart && partIndex === videoPartIndex;
  const finalizesCollage = isVideoPart || (isLastPart && !hasVideoPart);
  const partSize = isVideoPart ? 0 : Math.max(1, partSizes[partIndex] ?? 1);
  const partStartIndex = partSizes.slice(0, partIndex).reduce((a, b) => a + b, 0);
  const missions: CollageMission[] = isVideoPart
    ? []
    : fullMissions.slice(partStartIndex, partStartIndex + partSize);
  const partMultiSelectCount = multiSelect ? Math.max(1, partSize) : multiSelectCount;

  const initialPhase: Phase = isVideoPart ? 'generating' : 'intro';
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [currentMission, setCurrentMission] = useState(0);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [collageTitle, setCollageTitle] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState(t.uploading);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [resultUrl, setResultUrl] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [resultIsVideo, setResultIsVideo] = useState(false);
  const [resultVideoStarted, setResultVideoStarted] = useState(false);
  const [error, setError] = useState('');
  const [pollOffline, setPollOffline] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string>('');
  const [smsRequestState, setSmsRequestState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const [previewUrl, setPreviewUrl] = useState('');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewIsVideo, setPreviewIsVideo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickCaptureRef = useRef<HTMLInputElement>(null);
  const resultVideoRef = useRef<HTMLVideoElement>(null);
  const serverPollRef = useRef<(() => void) | null>(null);

  const stopPoll = useCallback(() => {
    if (serverPollRef.current) { serverPollRef.current(); serverPollRef.current = null; }
    setPollOffline(false);
  }, []);
  const startPoll = useCallback((jobId: string) => {
    stopPoll();
    setActiveJobId(jobId);
    let cancelled = false;
    let errors = 0;
    let handle: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      try {
        const data = await fetchCollageProgress(jobId);
        errors = 0;
        setPollOffline(false);
        if (serverWording(data.message)) setProgressLabel(data.message as string);
        setEtaSeconds(typeof data.etaSeconds === 'number' ? data.etaSeconds : null);
      } catch {
        errors += 1;
        if (errors >= 3) setPollOffline(true);
      } finally {
        if (!cancelled) handle = setTimeout(tick, errors >= 3 ? 5_000 : 1_000);
      }
    };
    handle = setTimeout(tick, 1_000);
    serverPollRef.current = () => {
      cancelled = true;
      if (handle) clearTimeout(handle);
    };
  }, [stopPoll]);
  const bgUnsubRef = useRef<(() => void) | null>(null);

  const handleSkip = useCallback(() => {
    if (isSplit && splitMeta && code) markCollageSkipped(code, splitGroupId);
    onContinue();
  }, [isSplit, splitMeta, code, onContinue]);

  useEffect(() => {
    if (isSplit && !isFirstPart && splitMeta && code && isCollageSkipped(code, splitGroupId)) {
      onContinue();
    }
  }, [isSplit, isFirstPart, splitMeta, code, onContinue]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setPreviewBlob(file);
    setPreviewIsVideo(file.type.startsWith('video/'));
    e.target.value = '';
  };

  const handleMultiFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    const remaining = Math.max(0, partMultiSelectCount - photos.length);
    const toAdd = files.slice(0, remaining);
    const startIdx = photos.length;
    const newPhotos: CapturedPhoto[] = toAdd.map((file, i) => ({
      missionIndex: startIdx + i,
      blob: file,
      previewUrl: URL.createObjectURL(file),
      isVideo: file.type.startsWith('video/'),
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const removeMultiPhoto = (idx: number) => {
    setPhotos((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((p, i) => ({ ...p, missionIndex: i })),
    );
  };

  const mergeSplitPhotos = (
    prior: { partIndex: number; photos: { blob: Blob; isVideo?: boolean }[] }[],
    local: CapturedPhoto[],
  ): CapturedPhoto[] => {
    const merged: CapturedPhoto[] = [];
    for (const stored of prior) {
      if (stored.partIndex >= partIndex) continue;
      const globalStart = partSizes.slice(0, stored.partIndex).reduce((a, b) => a + b, 0);
      stored.photos.forEach((ph, i) => {
        merged.push({
          missionIndex: globalStart + i,
          blob: ph.blob,
          previewUrl: URL.createObjectURL(ph.blob),
          isVideo: ph.isVideo,
        });
      });
    }
    const localStart = partStartIndex;
    [...local]
      .sort((a, b) => a.missionIndex - b.missionIndex)
      .forEach((ph) => {
        merged.push({
          ...ph,
          missionIndex: localStart + ph.missionIndex,
        });
      });
    return merged.sort((a, b) => a.missionIndex - b.missionIndex);
  };

  const photosForStorage = (list: CapturedPhoto[]) =>
    [...list]
      .sort((a, b) => a.missionIndex - b.missionIndex)
      .map((p) => ({ blob: p.blob, isVideo: p.isVideo }));

  const finishLocalPart = async (localPhotos: CapturedPhoto[]) => {
    if (isSplit && !finalizesCollage) {
      const activityCode = code ?? '';
      if (activityCode && splitMeta) {
        try {
          await saveCollagePart(activityCode, splitGroupId, {
            partIndex,
            photos: photosForStorage(localPhotos),
          });
          uploadSplitPhotosInBackground(
            activityCode,
            splitGroupId,
            localPhotos.map((p) => ({
              globalIndex: partStartIndex + p.missionIndex,
              blob: p.blob,
            })),
            {
              template,
              logoUrl,
              logoRightUrl,
              requiredImages: totalImages,
            },
            '',
          );
        } catch { }
      }
      onContinue();
      return;
    }

    if (isSplit && finalizesCollage) {
      const activityCode = code ?? '';
      let merged: CapturedPhoto[] = [];
      if (activityCode && splitMeta) {
        try {
          const prior = await loadCollageParts(activityCode, splitGroupId);
          merged = mergeSplitPhotos(prior, localPhotos);
        } catch {
          merged = mergeSplitPhotos([], localPhotos);
        }
      } else {
        merged = mergeSplitPhotos([], localPhotos);
      }
      if (merged.length < totalImages) {
        setError(
          t.needImagesEarlier(totalImages, merged.length),
        );
        setPhotos(merged);
        setPhase('capture');
        return;
      }
      setPhotos(merged);
    }
    setPhase('review');
  };

  const confirmPhoto = () => {
    if (!previewBlob || !previewUrl) return;
    const updated = [
      ...photos.filter((p) => p.missionIndex !== currentMission),
      { missionIndex: currentMission, blob: previewBlob, previewUrl, isVideo: previewIsVideo },
    ].sort((a, b) => a.missionIndex - b.missionIndex);

    setPhotos(updated);
    setPreviewUrl('');
    setPreviewBlob(null);
    setPreviewIsVideo(false);

    if (currentMission < missions.length - 1) {
      setCurrentMission((i) => i + 1);
    } else {
      void finishLocalPart(updated);
    }
  };

  const generateCollage = async (photosOverride?: CapturedPhoto[]) => {
    const source = photosOverride ?? photos;
    if (source.length !== totalImages) {
      setError(
        isSplit
          ? t.needImagesAllParts(totalImages, source.length)
          : t.needImagesSelected(totalImages, source.length),
      );
      setPhase('review');
      return;
    }

    setPhase('generating');
    setProgress(0);
    setProgressLabel(t.uploading);
    setEtaSeconds(null);
    setError('');

    const activityCode = code ?? '';
    const orderedPhotos = [...source].sort((a, b) => a.missionIndex - b.missionIndex);
    const effectiveGroupId = isSplit && splitMeta
      ? splitGroupId
      : singleGroupId;
    const jobId = makeSplitCollageJobId(activityCode, effectiveGroupId);
    const bgKey = `${activityCode}::${effectiveGroupId}`;
    const effectiveTitle = collageTitle.trim();

    try {
      const bg = startBackgroundCollage(bgKey, {
        photos: orderedPhotos.map((p) => ({ blob: p.blob, isVideo: p.isVideo })),
        photoIndices: orderedPhotos.map((p) => p.missionIndex),
        title: effectiveTitle,
        logoUrl,
        logoRightUrl,
        activityCode,
        template,
        splitGroupId: splitMeta ? splitGroupId : undefined,
        jobId,
        requiredImages: totalImages,
      });

      startPoll(jobId);
      const unsub = subscribeBackgroundCollage(bgKey, (j) => {
        setProgress((cur) => Math.max(cur, j.uploadPct));
        if (j.uploadPct >= 55) setProgressLabel(t.creatingCollage);
      });
      bgUnsubRef.current = unsub;

      const result = await bg.promise;

      stopPoll();
      unsub();
      bgUnsubRef.current = null;
      consumeBackgroundCollage(bgKey);

      setProgress(100);
      setProgressLabel(t.videoReady);
      setEtaSeconds(0);

      await new Promise((r) => setTimeout(r, 500));

      if (activityCode) {
        try {
          await clearCollageParts(activityCode, effectiveGroupId);
          if (isSplit && splitMeta) {
            await clearCollageParts(activityCode, splitGroupId);
            clearCollageSkipped(activityCode, splitGroupId);
          }
          await cleanupCollageJobPersistence(activityCode, effectiveGroupId);
        } catch { }
      }

      setResultUrl(result.url);
      setResultIsVideo(result.isVideo ?? false);
      setPhase('result');
    } catch (err) {
      stopPoll();
      if (bgUnsubRef.current) { bgUnsubRef.current(); bgUnsubRef.current = null; }
      setError(err instanceof Error ? err.message : t.videoError);
      setPhase('review');
    }
  };

  useEffect(() => () => {
    stopPoll();
    if (bgUnsubRef.current) { bgUnsubRef.current(); bgUnsubRef.current = null; }
  }, []);

  const formatEta = (secs: number): string => {
    if (secs <= 0) return t.almostDone;
    if (secs < 60) return t.secondsLeft(secs);
    if (secs > 10 * 60) return t.fewMinutesLeft;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s === 0 ? t.minutesLeft(m) : t.minutesSecondsLeft(m, String(s).padStart(2, '0'));
  };

  const shareUrl = code ? `${window.location.origin}/play/${code}` : undefined;

  const participantPhone = participant?.phoneNumber?.trim() || '';
  const canRequestSms = !!(smsForCollage && participantPhone && activeJobId);
  const handleRequestSms = useCallback(async () => {
    if (!canRequestSms || smsRequestState === 'sending') return;
    setSmsRequestState('sending');
    try {
      const res = await fetch(`/api/collage/jobs/${encodeURIComponent(activeJobId)}/notify-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: participantPhone }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSmsRequestState('sent');
      onContinue();
    } catch {
      setSmsRequestState('error');
    }
  }, [activeJobId, canRequestSms, onContinue, participantPhone, smsRequestState]);

  const getResultVideoFile = useCallback(async (): Promise<File | null> => {
    if (!resultIsVideo || !resultUrl) return null;
    try {
      const res = await fetch(resultUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      const type = blob.type.startsWith('video/') ? blob.type : 'video/mp4';
      return new File([blob], 'ganei-yehoshua-highlights.mp4', { type });
    } catch {
      return null;
    }
  }, [resultIsVideo, resultUrl]);

  const handleShare = useCallback(async () => {
    const shareText = buildVideoShareTextBody(lang);
    const shareTextWithUrl = buildVideoSharePlainText(lang, shareUrl);
    const file = await getResultVideoFile();

    if (navigator.share) {
      const candidates: ShareData[] = [
        ...(file
          ? [
              { files: [file], text: shareText },
              { files: [file], text: shareTextWithUrl },
              ...(shareUrl ? [{ files: [file], text: shareText, url: shareUrl }] : []),
            ]
          : []),
        { text: shareTextWithUrl },
        ...(shareUrl ? [{ text: shareText, url: shareUrl }] : []),
      ];

      for (const data of candidates) {
        if (navigator.canShare && !navigator.canShare(data)) continue;
        try {
          await navigator.share(data);
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(shareTextWithUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
    }
  }, [getResultVideoFile, shareUrl]);

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
    } catch { }
  };

  const handlePlayResultVideo = useCallback(async () => {
    const video = resultVideoRef.current;
    if (!video) return;
    try {
      setResultVideoStarted(true);
      await video.play();
      const el = video as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitEnterFullscreen) {
        el.webkitEnterFullscreen();
      }
    } catch {
      setResultVideoStarted(false);
    }
  }, []);

  useEffect(() => {
    setResultVideoStarted(false);
  }, [resultUrl]);

  useEffect(() => {
    if (isSplit) return;
    const activityCode = code ?? '';
    if (!activityCode) return;
    if (phase !== 'capture' && phase !== 'review') return;
    if (photos.length === 0) return;
    void saveCollagePart(activityCode, singleGroupId, {
      partIndex: 0,
      photos: photosForStorage(photos),
    }).catch(() => {});
  }, [photos, phase, isSplit, code, station._id]);

  const recoverRef = useRef(false);
  useEffect(() => {
    if (isSplit || recoverRef.current) return;
    recoverRef.current = true;
    const activityCode = code ?? '';
    if (!activityCode) return;
    const groupId = singleGroupId;
    const restoreFromIdb = async (): Promise<boolean> => {
      try {
        const stored = await loadCollageParts(activityCode, groupId);
        const photos0 = stored[0]?.photos ?? [];
        if (photos0.length === 0) return false;
        setPhotos(photos0.map((ph, i) => ({
          missionIndex: i,
          blob: ph.blob,
          previewUrl: URL.createObjectURL(ph.blob),
          isVideo: ph.isVideo,
        })));
        setPhase('review');
        return true;
      } catch { return false; }
    };
    (async () => {
      try {
        const completed = await getCompletedCollageResult(activityCode, groupId);
        if (completed) {
          setResultUrl(completed.url);
          setResultIsVideo(completed.isVideo);
          setPhase('result');
          return;
        }
        const serverJob = await findCollageJob(activityCode, groupId);
        if (serverJob && ['queued', 'preparing', 'encoding', 'uploading'].includes(serverJob.phase)) {
          setPhase('generating');
          setProgress(Math.min(99, Math.round(55 + serverJob.percent * 0.45)));
          setProgressLabel(serverWording(serverJob.message) ? serverJob.message as string : t.creatingCollage);
          try {
            const result = await waitForServerCollageJob(serverJob.jobId, (snap) => {
              setProgress((cur) => Math.max(cur, Math.min(99, Math.round(55 + snap.percent * 0.45))));
              if (serverWording(snap.message)) setProgressLabel(snap.message as string);
              setEtaSeconds(typeof snap.etaSeconds === 'number' ? snap.etaSeconds : null);
            });
            setProgress(100);
            setProgressLabel(t.videoReady);
            await cleanupCollageJobPersistence(activityCode, groupId);
            setResultUrl(result.url);
            setResultIsVideo(result.isVideo);
            setPhase('result');
          } catch {
            if (!(await restoreFromIdb())) setPhase('intro');
          }
          return;
        }
        await restoreFromIdb();
      } catch { }
    })();
  }, []);

  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (!isVideoPart || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    (async () => {
      const activityCode = code ?? '';
      if (!activityCode || !splitMeta) {
        setError(t.noSavedPhotos);
        setPhase('review');
        return;
      }

      const bgKey = `${activityCode}::${splitGroupId}`;
      const effectiveTitle = '';

      const finishWithResult = async (url: string, isVideo: boolean) => {
        setProgress(100);
        setProgressLabel(t.videoReady);
        setEtaSeconds(0);
        await new Promise((r) => setTimeout(r, 500));
        try {
          await clearCollageParts(activityCode, splitGroupId);
          clearCollageSkipped(activityCode, splitGroupId);
          await cleanupCollageJobPersistence(activityCode, splitGroupId);
        } catch { }
        consumeBackgroundCollage(bgKey);
        setResultUrl(url);
        setResultIsVideo(isVideo);
        setPhase('result');
      };

      const attachToJob = async (activeJobId: string, promise: Promise<{ url: string; isVideo: boolean }>) => {
        setPhase('generating');
        setProgress(0);
        setProgressLabel(t.uploading);
        setEtaSeconds(null);
        setError('');

        startPoll(activeJobId);

        const unsub = subscribeBackgroundCollage(bgKey, (j) => {
          setProgress((cur) => Math.max(cur, j.uploadPct));
          if (j.uploadPct >= 55) setProgressLabel(t.creatingCollage);
        });
        bgUnsubRef.current = unsub;

        try {
          const result = await promise;
          stopPoll();
          unsub();
          bgUnsubRef.current = null;
          await finishWithResult(result.url, result.isVideo);
        } catch {
          stopPoll();
          unsub();
          bgUnsubRef.current = null;
          consumeBackgroundCollage(bgKey);
          setError(t.videoErrorRetrying);
          await runFreshGeneration();
        }
      };

      const runFreshGeneration = async () => {
        try {
          const prior = await loadCollageParts(activityCode, splitGroupId);
          const merged = mergeSplitPhotos(prior, []);
          if (merged.length < totalImages) {
            setError(t.needImagesEarlier(totalImages, merged.length));
            setPhotos(merged);
            setPhase('review');
            return;
          }
          setPhotos(merged);
          setCollageTitle(effectiveTitle);
          await generateCollage(merged);
        } catch {
          setError(t.loadPhotosError);
          setPhase('review');
        }
      };

      const bg = getBackgroundCollage(bgKey);
      if (bg?.status === 'done' && bg.result) {
        await finishWithResult(bg.result.url, bg.result.isVideo);
        return;
      }
      if (bg?.status === 'pending') {
        await attachToJob(bg.jobId, bg.promise);
        return;
      }

      const completed = await getCompletedCollageResult(activityCode, splitGroupId);
      if (completed) {
        await finishWithResult(completed.url, completed.isVideo);
        return;
      }

      const serverJob = await findCollageJob(activityCode, splitGroupId);
      if (serverJob && ['queued', 'preparing', 'encoding', 'uploading'].includes(serverJob.phase)) {
        setPhase('generating');
        setProgress(serverJob.percent);
        setProgressLabel(serverJob.message || t.creatingCollage);
        try {
          const result = await waitForServerCollageJob(serverJob.jobId, (snap) => {
            setProgress((cur) => Math.max(cur, Math.min(99, Math.round(55 + snap.percent * 0.45))));
            if (snap.message) setProgressLabel(snap.message);
            setEtaSeconds(typeof snap.etaSeconds === 'number' ? snap.etaSeconds : null);
          });
          await finishWithResult(result.url, result.isVideo);
        } catch {
          await runFreshGeneration();
        }
        return;
      }

      await runFreshGeneration();
    })();
  }, []);

  const currentPhotoForMission = photos.find((p) => p.missionIndex === currentMission);
  const displayUrl = previewUrl || currentPhotoForMission?.previewUrl || '';
  const hasCapture = !!(previewBlob || currentPhotoForMission);

  if (phase === 'intro') {
    return (
      <Wrap>
        <Content>
          <TopLabel>{t.stationName}</TopLabel>
          <BigTitle>{header}</BigTitle>
          {description && <SubText>{description}</SubText>}

          {disclaimer && (
            <DisclaimerCard>{disclaimer}</DisclaimerCard>
          )}

          {isSplit && (
            <PartBadge>
              {t.partHeader(partIndex + 1, totalParts, partSize)}
            </PartBadge>
          )}

          {multiSelect ? (
            <MissionCard>
              <MissionNum>{partMultiSelectCount}</MissionNum>
              <MissionInfo>
                <MissionTitle>{t.chooseN(partMultiSelectCount)}</MissionTitle>
                <MissionDesc>{t.chooseAllAtOnce}</MissionDesc>
              </MissionInfo>
            </MissionCard>
          ) : (
            missions.map((m, i) => (
              <MissionCard key={i}>
                <MissionNum>{i + 1}</MissionNum>
                <MissionInfo>
                  <MissionTitle>{m.title}</MissionTitle>
                  {m.description && <MissionDesc>{m.description}</MissionDesc>}
                </MissionInfo>
              </MissionCard>
            ))
          )}

          <div style={{ marginTop: 8 }}>
            <PrimaryBtn onClick={() => { setCurrentMission(0); setPhotos([]); setPreviewUrl(''); setPreviewBlob(null); setPhase('capture'); }}>
              {t.startShooting}
            </PrimaryBtn>
            <OutlineBtn onClick={handleSkip}>{t.skipStation}</OutlineBtn>
          </div>
        </Content>
      </Wrap>
    );
  }

  if (phase === 'capture' && multiSelect) {
    const remaining = Math.max(0, partMultiSelectCount - photos.length);
    return (
      <Wrap>
        <CaptureLayout>
          <CaptureHeader>
            <TopLabel style={{ marginBottom: 4, fontSize: 15 }}>{t.stationName}{isSplit ? t.partSuffix(partIndex + 1, totalParts) : ''}</TopLabel>
            <BigTitle style={{ fontSize: 26, marginBottom: 6 }}>{t.chooseN(partMultiSelectCount)}</BigTitle>
            <SubText style={{ margin: '0 0 10px', fontSize: 16, color: 'rgba(255,255,255,0.85)' }}>
              {t.selectedOf(photos.length, partMultiSelectCount)}
            </SubText>
            {disclaimer && <CompactDisclaimer>{disclaimer}</CompactDisclaimer>}
          </CaptureHeader>

          {photos.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 6,
              flex: '1 1 auto',
              minHeight: 0,
              maxHeight: 'min(32dvh, 180px)',
              overflow: 'hidden',
              alignContent: 'start',
            }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: 'rgba(0,0,0,0.4)' }}>
                  {p.isVideo
                    ? <video src={p.previewUrl} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <img src={p.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  }
                  <button
                    onClick={() => removeMultiPhoto(i)}
                    style={{
                      position: 'absolute', top: 4, left: 4,
                      width: 22, height: 22, borderRadius: '50%', border: 'none',
                      background: 'rgba(0,0,0,0.65)', color: '#fff', cursor: 'pointer',
                      fontSize: 13, lineHeight: 1, padding: 0, fontFamily: 'inherit',
                    }}
                    aria-label={t.remove}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          <CaptureActions>
            {error && <p style={{ color: '#f87171', textAlign: 'center', fontSize: 12, margin: '0 0 6px' }}>{error}</p>}
            <ButtonRow>
              <HalfBtn onClick={() => quickCaptureRef.current?.click()} disabled={remaining === 0}>{t.openCamera}</HalfBtn>
              <HalfBtn onClick={() => fileInputRef.current?.click()} disabled={remaining === 0}>{t.fromGallery}</HalfBtn>
            </ButtonRow>
            <PrimaryBtn
              onClick={() => void finishLocalPart(photos)}
              disabled={photos.length < partMultiSelectCount}
            >
              {isSplit && !finalizesCollage ? t.saveAndContinue : t.confirmAndContinue}
            </PrimaryBtn>
            {isSplit && !isFirstPart && (
              <OutlineBtn onClick={handleSkip}>{t.skipStation}</OutlineBtn>
            )}
          </CaptureActions>

          <input ref={quickCaptureRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleMultiFilesSelected} />
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={handleMultiFilesSelected} />
        </CaptureLayout>
      </Wrap>
    );
  }

  if (phase === 'capture') {
    const mission = missions[currentMission];
    return (
      <Wrap>
        <CaptureLayout>
          <CaptureHeader>
            <TopLabel style={{ marginBottom: 4, fontSize: 15 }}>
              {t.shotOf(currentMission + 1, missions.length)}
              {isSplit ? t.partSuffix(partIndex + 1, totalParts) : ''}
            </TopLabel>
            <BigTitle style={{ fontSize: 26, marginBottom: 6 }}>{mission.title}</BigTitle>
            {mission.description && (
              <SubText style={{
                margin: '0 0 8px',
                fontSize: 16,
                lineHeight: 1.45,
                color: 'rgba(255,255,255,0.85)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {mission.description}
              </SubText>
            )}
            {disclaimer && <CompactDisclaimer>{disclaimer}</CompactDisclaimer>}
            <ProgressDots>
              {missions.map((_, i) => (
                <Dot key={i}
                  active={i === currentMission}
                  done={i < currentMission || !!photos.find((p) => p.missionIndex === i)}
                />
              ))}
            </ProgressDots>
          </CaptureHeader>

          <CaptureArea>
            {displayUrl
              ? (previewIsVideo || currentPhotoForMission?.isVideo)
                ? <video src={displayUrl} autoPlay muted playsInline loop style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <CapturePreviewImg src={displayUrl} alt="preview" />
              : <>
                  {mission.referenceImageUrl && <ReferenceImg src={mission.referenceImageUrl} alt="" />}
                  <PlaceholderIcon>📷</PlaceholderIcon><PlaceholderText>{t.takeOrUpload}</PlaceholderText>
                </>
            }
          </CaptureArea>

          <CaptureActions>
            {error && <p style={{ color: '#f87171', textAlign: 'center', fontSize: 12, margin: '0 0 6px' }}>{error}</p>}
            <ButtonRow>
              <HalfBtn onClick={() => quickCaptureRef.current?.click()}>{t.openCamera}</HalfBtn>
              <HalfBtn onClick={() => fileInputRef.current?.click()}>{t.fromGallery}</HalfBtn>
            </ButtonRow>
            {previewUrl && (
              <OutlineBtn
                onClick={() => { setPreviewUrl(''); setPreviewBlob(null); setPreviewIsVideo(false); }}
                style={{ marginBottom: 4, padding: '4px 0' }}
              >
                {t.retake}
              </OutlineBtn>
            )}
            <PrimaryBtn onClick={confirmPhoto} disabled={!hasCapture} style={{ marginTop: 4 }}>
              {currentMission === missions.length - 1 && isSplit && !finalizesCollage
                ? t.saveAndContinue
                : t.confirmPhotoAndContinue}
            </PrimaryBtn>
            {isSplit && !isFirstPart && (
              <OutlineBtn onClick={handleSkip}>{t.skipStation}</OutlineBtn>
            )}
          </CaptureActions>

          <input ref={quickCaptureRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileSelected} />
          <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileSelected} />
        </CaptureLayout>
      </Wrap>
    );
  }

  if (phase === 'review') {
    return (
      <Wrap>
        <Content>
          <TopLabel>{t.collageStation}</TopLabel>
          <BigTitle>{t.weHaveN(photos.length)}</BigTitle>
          <SubText>{t.canCreateLater}</SubText>
          {disclaimer && <CompactDisclaimer>{disclaimer}</CompactDisclaimer>}

          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.48)', marginBottom: 6 }}>{t.videoTitleLabel}</p>
          <TitleInput value={collageTitle} onChange={(e) => setCollageTitle(e.target.value)} placeholder={t.videoTitlePlaceholder} />

          {[...photos].sort((a, b) => a.missionIndex - b.missionIndex).map((photo) => {
            const mission = fullMissions[photo.missionIndex];
            return (
              <ReviewItem key={photo.missionIndex}>
                {photo.isVideo
                  ? <video src={photo.previewUrl} muted playsInline style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                  : <ReviewThumb src={photo.previewUrl} alt="" />
                }
                <ReviewInfo>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{mission?.title ?? t.photoLabel(photo.missionIndex + 1)}</div>
                  {mission?.description && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{mission.description}</div>}
                </ReviewInfo>
                <span style={{ fontSize: 20 }}>📷</span>
              </ReviewItem>
            );
          })}

          {error && <p style={{ color: '#f87171', textAlign: 'center', fontSize: 13, margin: '8px 0' }}>{error}</p>}

          {photos.length < totalImages ? (
            <PrimaryBtn onClick={handleSkip} style={{ marginTop: 12 }}>{t.continueActivity}</PrimaryBtn>
          ) : (
            <PrimaryBtn onClick={() => void generateCollage()} style={{ marginTop: 12 }}>{t.createCollage}</PrimaryBtn>
          )}
          {!isSplit && (
            <OutlineBtn onClick={() => { setPhase('capture'); setCurrentMission(missions.length - 1); }}>{t.backToShooting}</OutlineBtn>
          )}
        </Content>
      </Wrap>
    );
  }

  if (phase === 'generating') {
    return (
      <Wrap>
        <GeneratingWrap>
          <GeneratingCard>
            <GeneratingIntro>{t.generatingIntro}</GeneratingIntro>
            <LoadingGif src="/images/camera-loading.gif" alt="" />
            <ProgressTrack><ProgressFill pct={progress} /></ProgressTrack>
            <ProgressLabel>{t.creatingWithPct(progress)}</ProgressLabel>
            <ProgressSub>{progressLabel}</ProgressSub>
            {etaSeconds !== null && progress < 100 && !pollOffline && (
              <ProgressEta>{formatEta(etaSeconds)}</ProgressEta>
            )}
            {pollOffline && (
              <ProgressOffline>{t.weakReception}</ProgressOffline>
            )}
            {canRequestSms && smsRequestState !== 'sent' && (
              <>
                <SmsCalloutHint>{t.noNeedToWait}</SmsCalloutHint>
                <SmsCalloutBtn
                  type="button"
                  onClick={() => void handleRequestSms()}
                  disabled={smsRequestState === 'sending'}
                >
                  {smsRequestState === 'sending' ? t.sending : t.smsWhenReady}
                </SmsCalloutBtn>
              </>
            )}
            {smsRequestState === 'error' && (
              <p style={{ color: '#f87171', fontSize: 12, margin: '8px 0 0' }}>{t.errorTryAgain}</p>
            )}
            {isSplit && isVideoPart && (
              <OutlineBtn onClick={handleSkip} style={{ marginTop: 12 }}>{t.skipStation}</OutlineBtn>
            )}
          </GeneratingCard>
        </GeneratingWrap>
      </Wrap>
    );
  }

  if (phase === 'result') {
    return (
      <Wrap>
        <Content>
          <TopLabel>{t.collageStation}</TopLabel>
          <BigTitle>{t.videoReadyTitle}</BigTitle>

          <VideoWrap>
            {resultIsVideo
              ? <>
                  <ResultVideo
                    ref={resultVideoRef}
                    src={resultUrl}
                    controls={resultVideoStarted}
                    playsInline
                    loop
                    onPlay={() => setResultVideoStarted(true)}
                  />
                  {!resultVideoStarted && (
                    <VideoPlayOverlay type="button" aria-label={t.playVideo} onClick={() => void handlePlayResultVideo()}>
                      <VideoPlayIcon aria-hidden>▶</VideoPlayIcon>
                    </VideoPlayOverlay>
                  )}
                </>
              : <img src={resultUrl} alt="collage" style={{ width: '100%', display: 'block' }} />
            }
          </VideoWrap>

          {resultIsVideo && (
            <>
              <SubText style={{ marginBottom: 12, whiteSpace: 'pre-line' }}>
                {buildVideoShareTextBody(lang)}
              </SubText>
              <PrimaryBtn onClick={() => void handleShare()}>
                {shareCopied ? t.shareCopied : t.shareVideo}
              </PrimaryBtn>
            </>
          )}
          <PrimaryBtn onClick={handleDownload} style={resultIsVideo ? { marginTop: 8 } : undefined}>
            {t.downloadVideo}
          </PrimaryBtn>
          <OutlineBtn onClick={onContinue} style={{ color: '#f87171', marginTop: 8 }}>{t.backToActivity}</OutlineBtn>
        </Content>
      </Wrap>
    );
  }

  return null;
}
