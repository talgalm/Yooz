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
import {
  buildVideoSharePlainText,
  buildVideoShareTextBody,
} from '../../utils/ganeiYehoshuaShareText';
import {
  saveCollagePart,
  loadCollageParts,
  clearCollageParts,
} from './collageSplitStorage';
import {
  doCollageUpload,
  startBackgroundCollage,
  getBackgroundCollage,
  subscribeBackgroundCollage,
  consumeBackgroundCollage,
} from './backgroundCollageJob';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CollageMission {
  title: string;
  description?: string;
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
  overflow: 'hidden',
  height: '100dvh',
  maxHeight: '100dvh',
  animation: `${fadeIn} 400ms ease both`,
});

/** Scrollable body for intro / review (many list items). */
const Content = styled('div')({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
  display: 'flex',
  flexDirection: 'column',
  WebkitOverflowScrolling: 'touch',
  // Desktop: center the intro/review column at a comfortable reading width.
  // Previously stretched the full viewport on big screens (QA Jun 2026 pages
  // 2-3) which made the panel look stranded.
  '@media (min-width: 768px)': {
    width: 'min(720px, 90vw)',
    marginInline: 'auto',
    padding: '40px 24px calc(40px + env(safe-area-inset-bottom, 0px))',
  },
});

/** Capture fits one screen: compact header, small preview, actions pinned at bottom. */
const CaptureLayout = styled('div')({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  padding: '10px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
  maxWidth: 480,
  width: '100%',
  margin: '0 auto',
  boxSizing: 'border-box',
  // Desktop: a bit wider for the camera preview, but capped so the preview
  // area below (CaptureArea) doesn't blow up to viewport height (QA #5).
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
const MissionInfo = styled('div')({ flex: 1, textAlign: 'right' });
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

// Capture phase
const ProgressDots = styled('div')({ display: 'flex', gap: 6, justifyContent: 'center', margin: '6px 0 8px' });
const Dot = styled('div')<{ active?: boolean; done?: boolean }>(({ active, done }) => ({
  width: 8, height: 8, borderRadius: '50%',
  background: done ? '#10b981' : active ? '#ec4899' : 'rgba(255,255,255,0.22)',
  transition: 'background 0.3s',
}));

const CaptureArea = styled('div')({
  width: '100%',
  flex: '1 1 auto',
  minHeight: 0,
  maxHeight: 'min(36dvh, 200px)',
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
  // Desktop: stop the preview area from filling the entire viewport (QA
  // Jun 2026 page 4 — "way too big"). Fix it to a portrait photo frame
  // and let CaptureLayout center it vertically.
  '@media (min-width: 768px)': {
    flex: '0 0 auto',
    aspectRatio: '3 / 4',
    width: 'min(380px, 60vw)',
    maxHeight: 'min(60vh, 480px)',
    margin: '12px auto 16px',
  },
});
const CapturePreviewImg = styled('img')({ width: '100%', height: '100%', objectFit: 'cover' });
const PlaceholderIcon = styled('div')({ fontSize: 56, marginBottom: 12, opacity: 0.55 });
const PlaceholderText = styled('div')({ fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,0.78)', lineHeight: 1.4 });

const ButtonRow = styled('div')({ display: 'flex', gap: 8, marginBottom: 6 });
const HalfBtn = styled('button')({
  flex: 1, padding: '14px 10px', borderRadius: 12, border: 'none',
  background: 'rgba(255,255,255,0.09)', color: '#fff', fontSize: 15, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  '&:disabled': { opacity: 0.35, cursor: 'not-allowed' },
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
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '28px 24px 32px', textAlign: 'center',
});
const GeneratingIntro = styled('p')({
  fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.88)',
  margin: '0 0 16px', lineHeight: 1.45, textAlign: 'center',
});
const LoadingGif = styled('img')({
  width: 180, height: 180, objectFit: 'contain',
  margin: '0 auto 18px', display: 'block',
  // The gif already animates; no CSS animation needed.
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

// Result phase
const VideoWrap = styled('div')({ borderRadius: 16, overflow: 'hidden', width: '100%', marginBottom: 20, background: '#000' });
const ResultVideo = styled('video')({ width: '100%', display: 'block' });

// ─── Component ────────────────────────────────────────────────────────────────

export default function CollageStation({ station, onContinue, code }: Props) {
  const settings = (station.settings ?? {}) as Record<string, unknown>;
  const header = (settings.header as string) || station.name || 'תחנת צילום';
  const description = (settings.description as string) || station.description || '';
  const disclaimer = (settings.disclaimer as string) || '';
  const logoUrl = (settings.logoUrl as string) || '';
  const template = (settings.template as string) || 'default';
  const multiSelect = !!settings.multiSelect;
  const multiSelectCount = typeof settings.multiSelectCount === 'number' && settings.multiSelectCount > 0
    ? (settings.multiSelectCount as number)
    : 1;
  const rawMissions = settings.missions as CollageMission[] | undefined;
  const baseMissions: CollageMission[] = multiSelect
    ? Array.from({ length: multiSelectCount }, (_, i) => ({ title: `פריט ${i + 1}`, description: '' }))
    : (Array.isArray(rawMissions) && rawMissions.length > 0
        ? rawMissions
        : [{ title: 'צלמו תמונה', description: '' }]);

  // ── Split metadata ────────────────────────────────────────────────────────
  // When the station is split, each part owns a slice of the full image set.
  // Photos captured in earlier parts are persisted in IndexedDB so the last
  // part can stitch the whole collage together.
  //
  // The canonical shape stores `partSizes` — each entry is the image count that
  // part is responsible for. We fall back to even distribution for legacy data
  // that only saved `totalParts`.
  const splitMeta = station.collageSplit;
  // Apply optional per-activity photo reorder before slicing.
  const fullMissions: CollageMission[] =
    splitMeta?.photoOrder && splitMeta.photoOrder.length === baseMissions.length
      ? splitMeta.photoOrder.map((i) => baseMissions[i] ?? baseMissions[0])
      : baseMissions;
  const totalImages = fullMissions.length;
  // When a dedicated video-only part exists, partSizes[videoPartIndex] === 0
  // and the sum of photo parts still equals totalImages.
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
      // Self-heal stale partSizes whose sum no longer matches the station's
      // total image count — redistribute evenly across the photo parts only
      // (preserving the video-only zero entry if present).
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
  // The participant only finalizes (review + generate) on a non-video terminal part.
  // When a dedicated video part exists, photo parts always save & continue.
  const finalizesCollage = isVideoPart || (isLastPart && !hasVideoPart);
  const partSize = isVideoPart ? 0 : Math.max(1, partSizes[partIndex] ?? 1);
  const partStartIndex = partSizes.slice(0, partIndex).reduce((a, b) => a + b, 0);
  // The list of missions this part is responsible for (local-index 0..partSize-1).
  const missions: CollageMission[] = isVideoPart
    ? []
    : fullMissions.slice(partStartIndex, partStartIndex + partSize);
  const partMultiSelectCount = multiSelect ? Math.max(1, partSize) : multiSelectCount;

  // Every photo part (including split parts 2+) starts on intro so the disclaimer
  // and mission list are shown before capture.
  const initialPhase: Phase = isVideoPart ? 'generating' : 'intro';
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [currentMission, setCurrentMission] = useState(0);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [collageTitle, setCollageTitle] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('מעלה תמונות...');
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [resultUrl, setResultUrl] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [resultIsVideo, setResultIsVideo] = useState(false);
  const [error, setError] = useState('');

  // Capture state
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewIsVideo, setPreviewIsVideo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickCaptureRef = useRef<HTMLInputElement>(null);
  const serverPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgUnsubRef = useRef<(() => void) | null>(null);

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

  /** Map split parts to global mission indices 0..N-1 (part 1 → 0,1,2; part 2 → 3,4,5). */
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

  // ── Split-part completion ──────────────────────────────────────────────────
  // When the user finishes capturing this part's slice:
  //  - non-last parts save photos to IndexedDB and call onContinue (advance to
  //    the next station; the user will return later for the next split part);
  //  - the last part loads prior parts, merges them with the local capture, and
  //    moves to the review/generate flow with the full set.
  const finishLocalPart = async (localPhotos: CapturedPhoto[]) => {
    if (isSplit && !finalizesCollage) {
      const activityCode = code ?? '';
      if (activityCode && splitMeta) {
        try {
          await saveCollagePart(activityCode, splitMeta.splitGroupId, {
            partIndex,
            photos: photosForStorage(localPhotos),
          });
          // If this save completes the photo set AND a dedicated video part
          // exists later, kick off generation in the background. The XHR lives
          // at module scope so it survives this component unmounting, and the
          // result is often ready by the time the user reaches the video part.
          if (hasVideoPart) {
            try {
              const allParts = await loadCollageParts(activityCode, splitMeta.splitGroupId);
              const orderedPhotos: { blob: Blob; isVideo?: boolean }[] = [];
              for (let i = 0; i < totalParts; i++) {
                if (i === videoPartIndex) continue;
                const part = allParts.find((p) => p.partIndex === i);
                if (part) orderedPhotos.push(...part.photos);
              }
              if (orderedPhotos.length >= totalImages) {
                const bgKey = `${activityCode}::${splitMeta.splitGroupId}`;
                if (!getBackgroundCollage(bgKey)) {
                  startBackgroundCollage(bgKey, {
                    photos: orderedPhotos.slice(0, totalImages),
                    title: '',
                    logoUrl,
                    activityCode,
                    template,
                    jobId: `j_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
                  });
                }
              }
            } catch {
              /* swallow — video part will fall back to fresh generation */
            }
          }
        } catch { /* swallow — onContinue still advances */ }
      }
      onContinue();
      return;
    }

    if (isSplit && finalizesCollage) {
      const activityCode = code ?? '';
      let merged: CapturedPhoto[] = [];
      if (activityCode && splitMeta) {
        try {
          const prior = await loadCollageParts(activityCode, splitMeta.splitGroupId);
          merged = mergeSplitPhotos(prior, localPhotos);
        } catch {
          merged = mergeSplitPhotos([], localPhotos);
        }
      } else {
        merged = mergeSplitPhotos([], localPhotos);
      }
      if (merged.length < totalImages) {
        setError(
          `נדרשות ${totalImages} תמונות לסרטון. השלימו את החלקים הקודמים בפעילות (${merged.length}/${totalImages}).`,
        );
        setPhotos(merged);
        setPhase('capture');
        return;
      }
      setPhotos(merged);
    }
    setPhase('review');
  };

  // ── Capture navigation ──────────────────────────────────────────────────────
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

  // ── Collage generation ──────────────────────────────────────────────────────
  const generateCollage = async (photosOverride?: CapturedPhoto[]) => {
    const source = photosOverride ?? photos;
    if (source.length !== totalImages) {
      setError(
        isSplit
          ? `נדרשות ${totalImages} תמונות לסרטון. השלימו את כל חלקי התחנה לפני יצירת הסרטון (${source.length}/${totalImages}).`
          : `נדרשות ${totalImages} תמונות לסרטון (נבחרו ${source.length}).`,
      );
      setPhase('review');
      return;
    }

    setPhase('generating');
    setProgress(0);
    setProgressLabel('מעלה תמונות...');
    setEtaSeconds(null);
    setError('');

    // Poll the server's job entry every 1s for real progress + ETA. Server
    // progress (0-100%) is rescaled to the client's 60-99% range — 0-60 is
    // already used by the XHR upload-progress events, and 100 is reserved for
    // the final HTTP response. We tolerate transient 404s while the server is
    // still spinning up the job record.
    const jobId = `j_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const startServerPoll = () => {
      if (serverPollRef.current) clearInterval(serverPollRef.current);
      serverPollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/collage/progress/${jobId}`);
          if (!res.ok) return;
          const data = (await res.json()) as {
            phase: string;
            percent: number;
            message: string;
            etaSeconds: number | null;
          };
          const mapped = Math.min(99, Math.round(60 + (data.percent ?? 0) * 0.4));
          setProgress((cur) => Math.max(cur, mapped));
          if (data.message) setProgressLabel(data.message);
          setEtaSeconds(typeof data.etaSeconds === 'number' ? data.etaSeconds : null);
        } catch {
          /* network hiccup — next tick will retry */
        }
      }, 1000);
    };

    try {
      const activityCode = code ?? '';
      const orderedPhotos = [...source].sort((a, b) => a.missionIndex - b.missionIndex);
      const result = await doCollageUpload(
        {
          photos: orderedPhotos.map((p) => ({ blob: p.blob, isVideo: p.isVideo })),
          title: collageTitle,
          logoUrl,
          activityCode,
          template,
          jobId,
        },
        (uploadPct) => {
          setProgress((cur) => Math.max(cur, uploadPct));
          if (uploadPct >= 60 && !serverPollRef.current) {
            startServerPoll();
          }
        },
      );

      if (serverPollRef.current) { clearInterval(serverPollRef.current); serverPollRef.current = null; }
      setProgress(100);
      setProgressLabel('הסרטון מוכן!');
      setEtaSeconds(0);

      await new Promise((r) => setTimeout(r, 500));

      // Final video for a split group is built — wipe the saved parts.
      if (isSplit && splitMeta && (code ?? '')) {
        try { await clearCollageParts(code ?? '', splitMeta.splitGroupId); } catch { /* ignore */ }
      }

      setResultUrl(result.url);
      setResultIsVideo(result.isVideo ?? false);
      setPhase('result');
    } catch (err) {
      if (serverPollRef.current) { clearInterval(serverPollRef.current); serverPollRef.current = null; }
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת הסרטון');
      setPhase('review');
    }
  };

  // Stop polling + detach from background job on unmount.
  useEffect(() => () => {
    if (serverPollRef.current) clearInterval(serverPollRef.current);
    if (bgUnsubRef.current) { bgUnsubRef.current(); bgUnsubRef.current = null; }
  }, []);

  const formatEta = (secs: number): string => {
    if (secs <= 0) return 'כמעט סיימנו...';
    if (secs < 60) return `נותרו כ-${secs} שניות`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s === 0 ? `נותרו כ-${m} דקות` : `נותרו כ-${m}:${String(s).padStart(2, '0')} דקות`;
  };

  const shareUrl = code ? `${window.location.origin}/play/${code}` : undefined;

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
    const shareText = buildVideoShareTextBody();
    const shareTextWithUrl = buildVideoSharePlainText(shareUrl);
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
      /* clipboard unavailable */
    }
  }, [getResultVideoFile, shareUrl]);

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

  // ── Video-only part bootstrap ───────────────────────────────────────────────
  // When this station is a dedicated video-creation sub-station:
  //  1. If a background upload kicked off by the last photo part has finished,
  //     skip straight to the result.
  //  2. If it's still in flight, attach to it (show progress, poll server, await
  //     the promise) so the user sees a real progress bar instead of a fresh
  //     2-3 min wait.
  //  3. Otherwise (no bg job, e.g. page reload killed it), fall back to the
  //     original behavior: load photos from IndexedDB and generate from scratch.
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (!isVideoPart || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    (async () => {
      const activityCode = code ?? '';
      if (!activityCode || !splitMeta) {
        setError('לא נמצאו תמונות שמורות מהחלקים הקודמים');
        setPhase('review');
        return;
      }

      const runFreshGeneration = async () => {
        try {
          const prior = await loadCollageParts(activityCode, splitMeta.splitGroupId);
          const merged = mergeSplitPhotos(prior, []);
          if (merged.length < totalImages) {
            setError(`נדרשות ${totalImages} תמונות לסרטון. השלימו את החלקים הקודמים בפעילות (${merged.length}/${totalImages}).`);
            setPhotos(merged);
            setPhase('review');
            return;
          }
          setPhotos(merged);
          await generateCollage(merged);
        } catch {
          setError('שגיאה בטעינת התמונות');
          setPhase('review');
        }
      };

      const bgKey = `${activityCode}::${splitMeta.splitGroupId}`;
      const bg = getBackgroundCollage(bgKey);

      // Case 1: background job already finished — show result immediately.
      if (bg?.status === 'done' && bg.result) {
        setResultUrl(bg.result.url);
        setResultIsVideo(bg.result.isVideo);
        setPhase('result');
        try { await clearCollageParts(activityCode, splitMeta.splitGroupId); } catch { /* */ }
        consumeBackgroundCollage(bgKey);
        return;
      }

      // Case 2: background job in flight — attach to it.
      if (bg?.status === 'pending') {
        setPhase('generating');
        setProgress(bg.uploadPct);
        setProgressLabel(bg.uploadPct < 60 ? 'מעלה תמונות...' : 'יוצר קולאז׳...');
        setEtaSeconds(null);
        setError('');

        const unsub = subscribeBackgroundCollage(bgKey, (j) => {
          setProgress((cur) => Math.max(cur, j.uploadPct));
        });
        bgUnsubRef.current = unsub;

        // Mirror the server-progress polling started by generateCollage(). The
        // jobId was generated when the bg upload was kicked off in the prior
        // photo part, so the server already has the encoding state under it.
        if (serverPollRef.current) clearInterval(serverPollRef.current);
        const pollJobId = bg.jobId;
        serverPollRef.current = setInterval(async () => {
          try {
            const res = await fetch(`/api/collage/progress/${pollJobId}`);
            if (!res.ok) return;
            const data = (await res.json()) as {
              phase: string;
              percent: number;
              message: string;
              etaSeconds: number | null;
            };
            const mapped = Math.min(99, Math.round(60 + (data.percent ?? 0) * 0.4));
            setProgress((cur) => Math.max(cur, mapped));
            if (data.message) setProgressLabel(data.message);
            setEtaSeconds(typeof data.etaSeconds === 'number' ? data.etaSeconds : null);
          } catch { /* network hiccup — next tick will retry */ }
        }, 1000);

        try {
          const result = await bg.promise;
          if (serverPollRef.current) { clearInterval(serverPollRef.current); serverPollRef.current = null; }
          unsub();
          bgUnsubRef.current = null;
          setProgress(100);
          setProgressLabel('הסרטון מוכן!');
          setEtaSeconds(0);
          await new Promise((r) => setTimeout(r, 500));
          try { await clearCollageParts(activityCode, splitMeta.splitGroupId); } catch { /* */ }
          consumeBackgroundCollage(bgKey);
          setResultUrl(result.url);
          setResultIsVideo(result.isVideo);
          setPhase('result');
        } catch {
          if (serverPollRef.current) { clearInterval(serverPollRef.current); serverPollRef.current = null; }
          unsub();
          bgUnsubRef.current = null;
          consumeBackgroundCollage(bgKey);
          // Fall through to a fresh generation attempt rather than failing hard.
          await runFreshGeneration();
        }
        return;
      }

      // Case 3: no background job, or it errored — original behavior.
      await runFreshGeneration();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const currentPhotoForMission = photos.find((p) => p.missionIndex === currentMission);
  const displayUrl = previewUrl || currentPhotoForMission?.previewUrl || '';
  const hasCapture = !!(previewBlob || currentPhotoForMission);

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

          {disclaimer && (
            <DisclaimerCard>{disclaimer}</DisclaimerCard>
          )}

          {isSplit && (
            <PartBadge>
              🎬 חלק {partIndex + 1} מתוך {totalParts} – {partSize} תמונות בחלק הזה
            </PartBadge>
          )}

          {multiSelect ? (
            <MissionCard>
              <MissionNum>{partMultiSelectCount}</MissionNum>
              <MissionInfo>
                <MissionTitle>בחרו {partMultiSelectCount} תמונות או סרטונים</MissionTitle>
                <MissionDesc>אפשר לבחור הכול בבת אחת מהגלריה</MissionDesc>
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
              מתחילים לצלם 📸
            </PrimaryBtn>
            <OutlineBtn onClick={onContinue}>דלג על התחנה הזו</OutlineBtn>
          </div>
        </Content>
      </Wrap>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CAPTURE — multiSelect mode (single page, pick up to X items at once)
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'capture' && multiSelect) {
    const remaining = Math.max(0, partMultiSelectCount - photos.length);
    return (
      <Wrap>
        <CaptureLayout>
          <CaptureHeader>
            <TopLabel style={{ marginBottom: 4, fontSize: 15 }}>תחנת צילום{isSplit ? ` — חלק ${partIndex + 1}/${totalParts}` : ''}</TopLabel>
            <BigTitle style={{ fontSize: 26, marginBottom: 6 }}>בחרו {partMultiSelectCount} תמונות או סרטונים</BigTitle>
            <SubText style={{ margin: '0 0 10px', fontSize: 16, color: 'rgba(255,255,255,0.85)' }}>
              נבחרו {photos.length} מתוך {partMultiSelectCount}
            </SubText>
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
                    aria-label="הסר"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          <CaptureActions>
            {error && <p style={{ color: '#f87171', textAlign: 'center', fontSize: 12, margin: '0 0 6px' }}>{error}</p>}
            <ButtonRow>
              <HalfBtn onClick={() => quickCaptureRef.current?.click()} disabled={remaining === 0}>📷 פתח מצלמה</HalfBtn>
              <HalfBtn onClick={() => fileInputRef.current?.click()} disabled={remaining === 0}>🖼 מהגלריה</HalfBtn>
            </ButtonRow>
            <PrimaryBtn
              onClick={() => void finishLocalPart(photos)}
              disabled={photos.length < partMultiSelectCount}
            >
              {isSplit && !finalizesCollage ? 'שמור והמשך לתחנה הבאה' : 'אישור והמשך'}
            </PrimaryBtn>
            {isSplit && !isFirstPart && (
              <OutlineBtn onClick={onContinue}>דלג על התחנה הזו</OutlineBtn>
            )}
          </CaptureActions>

          {/* Camera input: image-only + capture so Android opens the camera directly instead of the picker. */}
          <input ref={quickCaptureRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleMultiFilesSelected} />
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={handleMultiFilesSelected} />
        </CaptureLayout>
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
        <CaptureLayout>
          <CaptureHeader>
            <TopLabel style={{ marginBottom: 4, fontSize: 15 }}>
              צילום {currentMission + 1} מתוך {missions.length}
              {isSplit ? ` — חלק ${partIndex + 1}/${totalParts}` : ''}
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
              : <><PlaceholderIcon>📷</PlaceholderIcon><PlaceholderText>צלמו תמונה או העלו מהגלריה</PlaceholderText></>
            }
          </CaptureArea>

          <CaptureActions>
            {error && <p style={{ color: '#f87171', textAlign: 'center', fontSize: 12, margin: '0 0 6px' }}>{error}</p>}
            <ButtonRow>
              <HalfBtn onClick={() => quickCaptureRef.current?.click()}>📷 פתח מצלמה</HalfBtn>
              <HalfBtn onClick={() => fileInputRef.current?.click()}>🖼 מהגלריה</HalfBtn>
            </ButtonRow>
            {previewUrl && (
              <OutlineBtn
                onClick={() => { setPreviewUrl(''); setPreviewBlob(null); setPreviewIsVideo(false); }}
                style={{ marginBottom: 4, padding: '4px 0' }}
              >
                בחר מחדש
              </OutlineBtn>
            )}
            <PrimaryBtn onClick={confirmPhoto} disabled={!hasCapture} style={{ marginTop: 4 }}>
              {currentMission === missions.length - 1 && isSplit && !finalizesCollage
                ? 'שמור והמשך לתחנה הבאה'
                : 'אישור תמונה והמשך'}
            </PrimaryBtn>
            {isSplit && !isFirstPart && (
              <OutlineBtn onClick={onContinue}>דלג על התחנה הזו</OutlineBtn>
            )}
          </CaptureActions>

          {/* Camera input: image-only + capture so Android opens the camera directly instead of the picker. */}
          <input ref={quickCaptureRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileSelected} />
          <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileSelected} />
        </CaptureLayout>
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
          <SubText>תוכלו ליצור סרטון מהתמונות בהמשך הפעילות!</SubText>

          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.48)', marginBottom: 6 }}>כותרת לסרטון (אופציונלי)</p>
          <TitleInput value={collageTitle} onChange={(e) => setCollageTitle(e.target.value)} placeholder="הרגעים שלנו יחד" dir="rtl" />

          {[...photos].sort((a, b) => a.missionIndex - b.missionIndex).map((photo) => {
            // Merged split photos use global indices (0..totalImages-1); use fullMissions, not this part's slice.
            const mission = fullMissions[photo.missionIndex];
            return (
              <ReviewItem key={photo.missionIndex}>
                {photo.isVideo
                  ? <video src={photo.previewUrl} muted playsInline style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                  : <ReviewThumb src={photo.previewUrl} alt="" />
                }
                <ReviewInfo>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{mission?.title ?? `תמונה ${photo.missionIndex + 1}`}</div>
                  {mission?.description && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{mission.description}</div>}
                </ReviewInfo>
                <span style={{ fontSize: 20 }}>📷</span>
              </ReviewItem>
            );
          })}

          {error && <p style={{ color: '#f87171', textAlign: 'center', fontSize: 13, margin: '8px 0' }}>{error}</p>}

          <PrimaryBtn onClick={generateCollage} style={{ marginTop: 12 }}>יצירת סרטון קולאז׳ 🎬</PrimaryBtn>
          {!isSplit && (
            <OutlineBtn onClick={() => { setPhase('capture'); setCurrentMission(missions.length - 1); }}>חזרה לצילום</OutlineBtn>
          )}
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
            <GeneratingIntro>הופכים את התמונות שלכם לסרטון מדהים... זה יקח כמה דקות</GeneratingIntro>
            <LoadingGif src="/images/camera-loading.gif" alt="" />
            <ProgressTrack><ProgressFill pct={progress} /></ProgressTrack>
            <ProgressLabel>יוצר קולאז׳... {progress}%</ProgressLabel>
            <ProgressSub>{progressLabel}</ProgressSub>
            {etaSeconds !== null && progress < 100 && (
              <ProgressEta>{formatEta(etaSeconds)}</ProgressEta>
            )}
            {isSplit && isVideoPart && (
              <OutlineBtn onClick={onContinue} style={{ marginTop: 12 }}>דלג על התחנה הזו</OutlineBtn>
            )}
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

          {resultIsVideo && (
            <>
              <SubText style={{ marginBottom: 12, whiteSpace: 'pre-line' }}>
                {buildVideoShareTextBody()}
              </SubText>
              <PrimaryBtn onClick={() => void handleShare()}>
                {shareCopied ? 'הטקסט הועתק — שתפו את הסרטון שהורדתם' : 'שתפו את הסרטון'}
              </PrimaryBtn>
            </>
          )}
          <PrimaryBtn onClick={handleDownload} style={resultIsVideo ? { marginTop: 8 } : undefined}>
            הורידו את הסרטון ⬇️
          </PrimaryBtn>
          <OutlineBtn onClick={onContinue} style={{ color: '#f87171', marginTop: 8 }}>חזרה לפעילות</OutlineBtn>
        </Content>
      </Wrap>
    );
  }

  return null;
}
