import { useState } from 'react';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../context/LanguageContext';
import { texts } from './ImagePositionPicker.i18n';
import {
  IMAGE_POSITION_STEPS,
  formatImagePosition,
  objectPositionStyle,
  parseImagePosition,
  visibleRegion,
} from './imagePosition';

/** Participants see the character in a square (`CharacterImage`, aspect-ratio 1 / 1). */
const FRAME_ASPECT = 1;
const STAGE_MAX = 260;
const PREVIEW_SIZE = 120;

const Wrap = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

const Hint = styled('p')({
  margin: 0,
  fontSize: 13,
  color: '#666',
  lineHeight: 1.4,
});

const Row = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  gap: 20,
});

const Stage = styled('div')({
  position: 'relative',
  display: 'inline-block',
  lineHeight: 0,
  borderRadius: 8,
  overflow: 'hidden',
  border: '1px solid #e0e0e0',
  background: '#f5f5f7',
});

const StageImage = styled('img')({
  display: 'block',
  maxWidth: STAGE_MAX,
  maxHeight: STAGE_MAX,
});

/** The part that stays; its huge shadow dims everything the crop cuts away. */
const VisibleFrame = styled('div')({
  position: 'absolute',
  boxShadow: '0 0 0 9999px rgba(20, 16, 40, 0.5)',
  outline: '2px solid #fff',
  pointerEvents: 'none',
  transition: 'left 0.15s ease, top 0.15s ease',
});

// Cells map to the image, not the reading direction: the first column is the
// image's left edge even on the Hebrew (RTL) admin.
const Grid = styled('div')({
  position: 'absolute',
  inset: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gridTemplateRows: 'repeat(3, 1fr)',
  direction: 'ltr',
});

const Cell = styled('button')({
  appearance: 'none',
  margin: 0,
  padding: 0,
  border: '1px dashed rgba(255, 255, 255, 0.55)',
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&::after': {
    content: '""',
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.75)',
    border: '2px solid #fff',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.45)',
  },
  '&:hover': { background: 'rgba(108, 92, 231, 0.2)' },
  '&:focus-visible': { outline: '2px solid #6c5ce7', outlineOffset: -2 },
  '&[aria-pressed="true"]::after': {
    width: 18,
    height: 18,
    background: '#6c5ce7',
  },
});

const Preview = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
});

const PreviewImage = styled('img')({
  width: PREVIEW_SIZE,
  height: PREVIEW_SIZE / FRAME_ASPECT,
  objectFit: 'cover',
  borderRadius: 16,
  border: '1px solid #e0e0e0',
  display: 'block',
});

const PreviewLabel = styled('span')({
  fontSize: 12,
  color: '#777',
});

interface Props {
  src: string;
  /** Stored `"x% y%"`; empty means the centre. */
  value?: string;
  onChange: (value: string) => void;
}

/**
 * Lets the admin pick which part of an image survives the square crop participants
 * see: a 3x3 grid over the whole image, with the cropped-away part dimmed.
 */
export default function ImagePositionPicker({ src, value, onChange }: Props) {
  const t = useTranslations(texts);
  const [natural, setNatural] = useState<{ src: string; width: number; height: number } | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) return null;

  const { x, y } = parseImagePosition(value);
  const region =
    natural?.src === src ? visibleRegion(natural.width, natural.height, FRAME_ASPECT, value) : null;

  return (
    <Wrap>
      <Hint>{t.hint}</Hint>
      <Row>
        <Stage>
          <StageImage
            src={src}
            alt=""
            onLoad={(e) =>
              setNatural({ src, width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })
            }
            onError={() => setFailedSrc(src)}
          />
          {region && (
            <VisibleFrame
              style={{
                left: `${region.left * 100}%`,
                top: `${region.top * 100}%`,
                width: `${region.width * 100}%`,
                height: `${region.height * 100}%`,
              }}
            />
          )}
          <Grid>
            {IMAGE_POSITION_STEPS.map((cellY, row) =>
              IMAGE_POSITION_STEPS.map((cellX, column) => {
                const label = `${t.vertical[row]} ${t.horizontal[column]}`;
                return (
                  <Cell
                    key={`${cellX}-${cellY}`}
                    type="button"
                    aria-label={label}
                    title={label}
                    aria-pressed={cellX === x && cellY === y}
                    onClick={() => onChange(formatImagePosition(cellX, cellY))}
                  />
                );
              })
            )}
          </Grid>
        </Stage>
        <Preview>
          <PreviewImage src={src} alt="" style={{ objectPosition: objectPositionStyle(value) }} />
          <PreviewLabel>{t.preview}</PreviewLabel>
        </Preview>
      </Row>
    </Wrap>
  );
}
