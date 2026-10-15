
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { styled } from '@mui/material/styles';

interface PhotoLabel { title: string; description?: string }

export interface SplitEditorResult {
  partSizes: number[];
  videoPartIndex: number | null;
  photoOrder: number[];
  partNames: string[];
  partDescriptions: string[];
  videoOrder: number[];
}

interface Props {
  stationName: string;
  photos: PhotoLabel[];
  missions: PhotoLabel[];
  initialPartSizes: number[];
  initialVideoPartIndex: number | null;
  initialPartNames: string[];
  initialPartDescriptions: string[];
  initialVideoOrder?: number[];
  onCancel: () => void;
  onSave: (result: SplitEditorResult) => void;
  t: Record<string, string>;
}

const Overlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.42)',
  zIndex: 1100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
});

const Card = styled('div')({
  background: '#fef3c7',
  borderRadius: 18,
  padding: '20px 22px',
  width: '100%',
  maxWidth: 380,
  maxHeight: '90dvh',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  boxShadow: '0 10px 32px rgba(0,0,0,0.22)',
  border: '1px solid rgba(0,0,0,0.06)',
});

const Title = styled('h3')({
  margin: 0,
  fontSize: 17,
  fontWeight: 800,
  color: '#3a2e0c',
  textAlign: 'center',
});

const Scroll = styled('div')({
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  paddingRight: 2,
  paddingBottom: 4,
  WebkitOverflowScrolling: 'touch',
});

const PartCard = styled('div')<{ dragOver?: boolean }>(({ dragOver }) => ({
  background: '#fffbeb',
  border: `2px solid ${dragOver ? '#f59e0b' : '#fde68a'}`,
  borderRadius: 12,
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  transition: 'border-color 120ms',
}));

const PartHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
});

const PartTitle = styled('div')({
  fontWeight: 800,
  fontSize: 14,
  color: '#3a2e0c',
});

const RemoveBtn = styled('button')({
  background: 'transparent',
  border: 'none',
  color: '#9ca3af',
  fontSize: 12,
  cursor: 'pointer',
  padding: '2px 6px',
  borderRadius: 4,
  fontFamily: 'inherit',
  '&:hover': { color: '#dc2626', background: '#fef2f2' },
});

const PhotoRow = styled('div')<{ dragging?: boolean }>(({ dragging }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 4px',
  fontSize: 13,
  color: '#3a2e0c',
  cursor: 'grab',
  borderRadius: 6,
  opacity: dragging ? 0.4 : 1,
  '&:active': { cursor: 'grabbing' },
  '&:hover': { background: 'rgba(245,158,11,0.08)' },
}));

const DragGrip = styled('span')({
  width: 12,
  height: 16,
  flexShrink: 0,
  cursor: 'grab',
  backgroundImage: 'radial-gradient(circle, #a16207 1.3px, transparent 1.3px)',
  backgroundSize: '5px 5px',
  backgroundPosition: 'center',
});

const EmptyHint = styled('div')({
  fontSize: 12,
  color: '#a16207',
  fontStyle: 'italic',
  padding: '6px 4px',
});

const AddBtn = styled('button')({
  background: '#fff',
  border: '1px dashed #fbbf24',
  borderRadius: 10,
  padding: '10px',
  fontSize: 20,
  fontWeight: 700,
  color: '#a16207',
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { background: '#fef9c3' },
});

const VideoToggleRow = styled('label')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  color: '#3a2e0c',
  cursor: 'pointer',
  padding: '6px 2px',
});

const Footer = styled('div')({
  display: 'flex',
  gap: 10,
  marginTop: 4,
});

const CancelBtn = styled('button')({
  flex: 1,
  background: '#e0f2fe',
  color: '#075985',
  border: 'none',
  borderRadius: 10,
  padding: '10px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { background: '#bae6fd' },
});

const SaveBtn = styled('button')({
  flex: 1,
  background: '#a78bfa',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '10px',
  fontSize: 14,
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { background: '#8b5cf6' },
});

const PartNameInput = styled('input')({
  flex: 1,
  minWidth: 0,
  padding: '5px 8px',
  border: '1px solid #fde68a',
  borderRadius: 8,
  background: '#fff',
  fontSize: 14,
  fontWeight: 800,
  color: '#3a2e0c',
  fontFamily: 'inherit',
});

const PartDescriptionInput = styled('textarea')({
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  margin: '0 0 8px',
  padding: '6px 8px',
  border: '1px solid #fde68a',
  borderRadius: 8,
  background: '#fff',
  fontSize: 13,
  color: '#3a2e0c',
  fontFamily: 'inherit',
  resize: 'vertical',
});

const VideoOrderCard = styled('div')({
  position: 'relative',
  background: '#fffbeb',
  border: '2px solid #fde68a',
  borderRadius: 12,
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
});

const VideoOrderHint = styled('div')({ fontSize: 12, color: '#a16207' });

const noForward = { shouldForwardProp: (prop: PropertyKey) => !String(prop).startsWith('$') };

const VideoOrderRow = styled('div', noForward)<{ $dragging: boolean; $picked: boolean }>(({ $dragging, $picked }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 8px',
  fontSize: 13,
  color: '#3a2e0c',
  cursor: 'grab',
  borderRadius: 8,
  border: `1px ${$dragging ? 'dashed #f59e0b' : 'solid #fde68a'}`,
  background: $dragging ? '#fef3c7' : '#fff',
  opacity: $dragging ? 0.6 : 1,
  boxShadow: $picked ? '0 0 0 2px #f59e0b, 0 4px 10px rgba(161,98,7,0.18)' : 'none',
  userSelect: 'none',
  transition: 'box-shadow 120ms, opacity 120ms',
  '&:active': { cursor: 'grabbing' },
}));

const SlotNumber = styled('span')({
  width: 22,
  height: 22,
  flexShrink: 0,
  borderRadius: '50%',
  background: '#f59e0b',
  color: '#fff',
  fontSize: 12,
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const VideoOnlyTag = styled('div')({
  fontSize: 12,
  fontWeight: 600,
  color: '#7c3aed',
  background: '#ede9fe',
  borderRadius: 6,
  padding: '6px 8px',
  textAlign: 'center',
});

interface PartState {
  photoIndices: number[];
  isVideoOnly: boolean;
}

function buildInitialParts(
  totalPhotos: number,
  initialPartSizes: number[],
  initialVideoPartIndex: number | null,
): PartState[] {
  const sizes = initialPartSizes.length > 0 ? [...initialPartSizes] : [totalPhotos];
  let cursor = 0;
  return sizes.map((size, idx) => {
    const isVideo = initialVideoPartIndex === idx;
    if (isVideo) return { photoIndices: [], isVideoOnly: true };
    const indices = Array.from({ length: size }, (_, i) => cursor + i);
    cursor += size;
    return { photoIndices: indices, isVideoOnly: false };
  });
}

function videoListFrom(count: number, videoOrder?: number[]): number[] {
  const missions = Array.from({ length: count }, (_, i) => i);
  const valid = videoOrder && videoOrder.length === count && new Set(videoOrder).size === count;
  return valid ? [...missions].sort((a, b) => videoOrder[a] - videoOrder[b]) : missions;
}

export default function CollageSplitEditor({
  stationName,
  photos,
  missions,
  initialPartSizes,
  initialVideoPartIndex,
  initialPartNames,
  initialPartDescriptions,
  initialVideoOrder,
  onCancel,
  onSave,
  t,
}: Props) {
  const totalPhotos = photos.length;
  const [parts, setParts] = useState<PartState[]>(() =>
    buildInitialParts(totalPhotos, initialPartSizes, initialVideoPartIndex),
  );
  const [partNames, setPartNames] = useState<string[]>(() =>
    Array.from({ length: Math.max(initialPartSizes.length, 1) }, (_, i) => initialPartNames[i] ?? ''),
  );
  const [partDescriptions, setPartDescriptions] = useState<string[]>(() =>
    Array.from({ length: Math.max(initialPartSizes.length, 1) }, (_, i) => initialPartDescriptions[i] ?? ''),
  );
  const [videoList, setVideoList] = useState<number[]>(() => videoListFrom(missions.length, initialVideoOrder));

  const [videoDragging, setVideoDragging] = useState<number | null>(null);
  const [videoPicked, setVideoPicked] = useState<number | null>(null);
  const videoRows = useRef(new Map<number, HTMLDivElement>());
  const videoTops = useRef(new Map<number, number>());

  useLayoutEffect(() => {
    videoRows.current.forEach((row, mission) => {
      const top = row.offsetTop;
      const before = videoTops.current.get(mission);
      videoTops.current.set(mission, top);
      if (before === undefined || before === top) return;
      row.animate(
        [{ transform: `translateY(${before - top}px)` }, { transform: 'translateY(0)' }],
        { duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
      );
    });
  }, [videoList]);

  const flashVideoRow = (mission: number) => {
    videoRows.current.get(mission)?.animate(
      [{ backgroundColor: '#fde68a' }, { backgroundColor: '#ffffff' }],
      { duration: 800, easing: 'ease-out' },
    );
  };

  const moveVideoMission = (mission: number, to: number) => {
    setVideoList((prev) => {
      const from = prev.indexOf(mission);
      if (from === -1 || from === to) return prev;
      const next = [...prev];
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });
  };
  const [dragging, setDragging] = useState<{ partIdx: number; photoIdx: number } | null>(null);
  const [dragOverPart, setDragOverPart] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const videoPartIndex = parts.findIndex((p) => p.isVideoOnly);
  const hasVideoPart = videoPartIndex >= 0;

  const addPart = () => {
    setParts((prev) => [...prev, { photoIndices: [], isVideoOnly: false }]);
    setPartNames((prev) => [...prev, '']);
    setPartDescriptions((prev) => [...prev, '']);
  };

  const removePart = (idx: number) => {
    if (parts.length <= 1) return;
    setPartNames((prev) => prev.filter((_, i) => i !== idx));
    setPartDescriptions((prev) => prev.filter((_, i) => i !== idx));
    setParts((prev) => {
      const removed = prev[idx];
      const rest = prev.filter((_, i) => i !== idx);
      if (removed.photoIndices.length === 0) return rest;
      const targetIdx = (() => {
        for (let i = idx - 1; i >= 0; i--) {
          if (!rest[i]?.isVideoOnly) return i;
        }
        for (let i = 0; i < rest.length; i++) {
          if (!rest[i]?.isVideoOnly) return i;
        }
        return -1;
      })();
      if (targetIdx === -1) {
        return rest.map((p, i) => i === 0
          ? { isVideoOnly: false, photoIndices: [...removed.photoIndices, ...p.photoIndices] }
          : p);
      }
      return rest.map((p, i) => i === targetIdx
        ? { ...p, photoIndices: [...p.photoIndices, ...removed.photoIndices] }
        : p);
    });
  };

  const toggleVideoPart = () => {
    if (hasVideoPart) {
      setPartNames((prev) => prev.filter((_, i) => i !== videoPartIndex));
      setPartDescriptions((prev) => prev.filter((_, i) => i !== videoPartIndex));
    } else {
      setPartNames((prev) => [...prev, '']);
      setPartDescriptions((prev) => [...prev, '']);
    }
    setParts((prev) => {
      if (hasVideoPart) {
        return prev.filter((p) => !p.isVideoOnly);
      }
      return [...prev, { photoIndices: [], isVideoOnly: true }];
    });
  };

  const dragHandle = useRef<{ srcPart: number; srcIdx: number } | null>(null);

  const onPhotoDragStart = (e: React.DragEvent, partIdx: number, photoIdx: number) => {
    dragHandle.current = { srcPart: partIdx, srcIdx: photoIdx };
    setDragging({ partIdx, photoIdx });
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', 'collage-photo'); } catch { }
  };

  const onPhotoDragEnd = () => {
    dragHandle.current = null;
    setDragging(null);
    setDragOverPart(null);
  };

  const onPartDragOver = (e: React.DragEvent, partIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPart(partIdx);
  };

  const onPartDragLeave = (partIdx: number) => {
    if (dragOverPart === partIdx) setDragOverPart(null);
  };

  const onPartDrop = (e: React.DragEvent, targetPart: number) => {
    e.preventDefault();
    const src = dragHandle.current;
    dragHandle.current = null;
    setDragging(null);
    setDragOverPart(null);
    if (!src) return;
    if (parts[targetPart]?.isVideoOnly) return;
    setParts((prev) => {
      const next = prev.map((p) => ({ ...p, photoIndices: [...p.photoIndices] }));
      const photoId = next[src.srcPart].photoIndices.splice(src.srcIdx, 1)[0];
      if (photoId === undefined) return prev;
      next[targetPart].photoIndices.push(photoId);
      return next;
    });
  };

  const save = () => {
    const photoOrder: number[] = [];
    const partSizes: number[] = [];
    let videoIdx: number | null = null;
    parts.forEach((p, i) => {
      if (p.isVideoOnly) {
        videoIdx = i;
        partSizes.push(0);
        return;
      }
      partSizes.push(p.photoIndices.length);
      photoOrder.push(...p.photoIndices);
    });
    const videoOrder = new Array<number>(videoList.length);
    videoList.forEach((mission, slot) => { videoOrder[mission] = slot; });
    onSave({
      partSizes,
      videoPartIndex: videoIdx,
      photoOrder,
      partNames: parts.map((_, i) => (partNames[i] ?? '').trim()),
      partDescriptions: parts.map((_, i) => (partDescriptions[i] ?? '').trim()),
      videoOrder,
    });
  };

  return (
    <Overlay onClick={onCancel}>
      <Card onClick={(e) => e.stopPropagation()}>
        <Title>{(t.collageSplitEditorTitle || 'Split station "..."').replace('...', stationName)}</Title>

        <Scroll>
          {parts.map((part, pIdx) => (
            <PartCard
              key={pIdx}
              dragOver={dragOverPart === pIdx && !part.isVideoOnly}
              onDragOver={(e) => !part.isVideoOnly && onPartDragOver(e, pIdx)}
              onDragLeave={() => onPartDragLeave(pIdx)}
              onDrop={(e) => onPartDrop(e, pIdx)}
            >
              <PartHeader>
                <PartTitle>{pIdx + 1}.</PartTitle>
                <PartNameInput
                  value={partNames[pIdx] ?? ''}
                  onChange={(e) => setPartNames((prev) => prev.map((n, i) => (i === pIdx ? e.target.value : n)))}
                  placeholder={`${t.collageSplitEditorSubPart || 'Sub-station'} ${pIdx + 1}`}
                  aria-label={t.collageSplitEditorPartName}
                />
                {parts.length > 1 && (
                  <RemoveBtn type="button" onClick={() => removePart(pIdx)}>
                    {t.collageSplitEditorRemove || 'Remove'}
                  </RemoveBtn>
                )}
              </PartHeader>
              {!part.isVideoOnly && (
                <PartDescriptionInput
                  value={partDescriptions[pIdx] ?? ''}
                  onChange={(e) => setPartDescriptions((prev) => prev.map((d, i) => (i === pIdx ? e.target.value : d)))}
                  placeholder={t.collageSplitEditorPartDescription}
                  aria-label={t.collageSplitEditorPartDescription}
                  rows={2}
                />
              )}

              {part.isVideoOnly ? (
                <VideoOnlyTag>
                  {t.collageSplitEditorVideoOnly || 'Video creation only'}
                </VideoOnlyTag>
              ) : part.photoIndices.length === 0 ? (
                <EmptyHint>{t.collageSplitEditorEmpty || 'No photos here yet'}</EmptyHint>
              ) : (
                part.photoIndices.map((globalPhotoIdx, photoIdx) => (
                  <PhotoRow
                    key={`${pIdx}-${globalPhotoIdx}`}
                    draggable
                    dragging={dragging?.partIdx === pIdx && dragging?.photoIdx === photoIdx}
                    onDragStart={(e) => onPhotoDragStart(e, pIdx, photoIdx)}
                    onDragEnd={onPhotoDragEnd}
                  >
                    <DragGrip />
                    <span>{photos[globalPhotoIdx]?.title || `${t.photoLabel} ${globalPhotoIdx + 1}`}</span>
                  </PhotoRow>
                ))
              )}
            </PartCard>
          ))}

          <AddBtn type="button" onClick={addPart} title={t.collageSplitEditorAdd || 'Add sub-station'}>
            +
          </AddBtn>

          <VideoToggleRow>
            <input
              type="checkbox"
              checked={hasVideoPart}
              onChange={toggleVideoPart}
            />
            <span>{t.collageSplitEditorVideoToggle || 'Dedicated video creation sub-station'}</span>
          </VideoToggleRow>

          <VideoOrderCard>
            <PartTitle>{t.collageSplitEditorVideoOrder}</PartTitle>
            <VideoOrderHint>{t.collageSplitEditorVideoOrderHint}</VideoOrderHint>
            {videoList.map((mission, slot) => (
              <VideoOrderRow
                key={mission}
                ref={(row) => { if (row) videoRows.current.set(mission, row); else videoRows.current.delete(mission); }}
                draggable
                $dragging={videoDragging === mission}
                $picked={videoPicked === mission}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(mission));
                  setVideoPicked(null);
                  setVideoDragging(mission);
                }}
                onDragOver={(e) => {
                  if (videoDragging === null) return;
                  e.preventDefault();
                  if (videoDragging === mission) return;
                  const from = videoList.indexOf(videoDragging);
                  const box = e.currentTarget.getBoundingClientRect();
                  const middle = box.top + box.height / 2;
                  if (from < slot ? e.clientY > middle : e.clientY < middle) moveVideoMission(videoDragging, slot);
                }}
                onDrop={(e) => e.preventDefault()}
                onDragEnd={() => {
                  if (videoDragging !== null) flashVideoRow(videoDragging);
                  setVideoDragging(null);
                }}
                onClick={() => {
                  if (videoPicked === null) { setVideoPicked(mission); return; }
                  if (videoPicked !== mission) {
                    moveVideoMission(videoPicked, slot);
                    flashVideoRow(videoPicked);
                  }
                  setVideoPicked(null);
                }}
              >
                <DragGrip />
                <SlotNumber>{slot + 1}</SlotNumber>
                <span>{missions[mission]?.title || `${t.photoLabel} ${mission + 1}`}</span>
              </VideoOrderRow>
            ))}
          </VideoOrderCard>
        </Scroll>

        <Footer>
          <CancelBtn type="button" onClick={onCancel}>
            {t.collageSplitEditorCancel || 'Cancel'}
          </CancelBtn>
          <SaveBtn type="button" onClick={save}>
            {t.collageSplitEditorSave || 'Save'}
          </SaveBtn>
        </Footer>
      </Card>
    </Overlay>
  );
}
