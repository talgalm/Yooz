import { useCallback, useEffect, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { formatSeconds, trimmedDuration, usedSceneCount } from '../../../utils/collageVideo';
import { samplePhotoImage } from '../../../utils/collageSamples';
import { replaceKeyGreen } from '../../../utils/collageChroma';
import { texts } from './CollageEditor.i18n';
import { PauseIcon, PlayIcon } from './CollageEditor.icons';

interface SceneBox {
  startSec: number;
  endSec: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TemplateInfo {
  id: string;
  width: number;
  height: number;
  duration: number;
  scenes: SceneBox[];
}

const PURPLE = '#6C5CE7';
const CANVAS_WIDTH = 300;
const SCENE_BUFFER_PX = 30;
const SHOW_BEFORE_SEC = 0.2;
const SHOW_AFTER_SEC = 0.4;
const POSTER_INTO_SCENE_SEC = 0.6;

let templatesRequest: Promise<TemplateInfo[]> | null = null;

function loadTemplates(): Promise<TemplateInfo[]> {
  templatesRequest ??= fetch('/api/collage/templates')
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
    .then((data: { templates: TemplateInfo[] }) => data.templates)
    .catch((err) => {
      templatesRequest = null;
      throw err;
    });
  return templatesRequest;
}

const Wrap = styled('div')({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 });
const Title = styled('div')({ alignSelf: 'stretch', fontSize: 14, fontWeight: 700, color: '#2d2540' });
const Screen = styled('canvas')({ display: 'block', borderRadius: 12, background: '#111', boxShadow: '0 4px 18px rgba(40,30,70,0.18)' });
const HiddenVideo = styled('video')({ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' });
const Controls = styled('div')({ display: 'flex', alignItems: 'center', gap: 10, width: CANVAS_WIDTH, direction: 'ltr' });
const PlayButton = styled('button')({
  flexShrink: 0,
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: 'none',
  background: PURPLE,
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(108,92,231,0.35)',
  '&:disabled': { opacity: 0.45, cursor: 'default', boxShadow: 'none' },
});
const Bar = styled('div')({ position: 'relative', flex: 1, height: 8, borderRadius: 4, background: '#e6e1f5', cursor: 'pointer' });
const Fill = styled('div')({ position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 4, background: PURPLE });
const Clock = styled('span')({ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: '#2d2540' });
const Info = styled('div')({ alignSelf: 'stretch', fontSize: 13, fontWeight: 600, color: '#2d2540' });
const Warn = styled('div')({ alignSelf: 'stretch', fontSize: 13, fontWeight: 600, color: '#b26a00' });

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  if (!image.complete || !image.naturalWidth) return;
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

interface Props {
  templateId: string;
  photoCount: number;
}

export default function CollageTemplatePreview({ templateId, photoCount }: Props) {
  const t = useTranslations(texts);
  const [templates, setTemplates] = useState<TemplateInfo[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layerRef = useRef<HTMLCanvasElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    loadTemplates().then((list) => alive && setTemplates(list)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, []);

  const info = templates?.find((tpl) => tpl.id === templateId) ?? null;
  const sceneCount = info ? usedSceneCount(info.scenes.length, photoCount) : 0;
  const endAt = info ? trimmedDuration(info.scenes.map((s) => s.endSec), photoCount, info.duration) : 0;
  const height = info ? Math.round((CANVAS_WIDTH * info.height) / info.width) : Math.round(CANVAS_WIDTH * 1.25);

  const draw = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !info || video.readyState < 2) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const layer = layerRef.current ?? document.createElement('canvas');
    layerRef.current = layer;
    layer.width = canvas.width;
    layer.height = canvas.height;
    const lctx = layer.getContext('2d', { willReadFrequently: true });
    if (!lctx) return;
    const now = video.currentTime;
    const buffer = (SCENE_BUFFER_PX * canvas.width) / info.width;
    lctx.clearRect(0, 0, layer.width, layer.height);
    info.scenes.slice(0, sceneCount).forEach((scene, i) => {
      if (now < scene.startSec - SHOW_BEFORE_SEC || now > scene.endSec + SHOW_AFTER_SEC) return;
      drawCover(
        lctx,
        samplePhotoImage(i),
        scene.x * canvas.width - buffer,
        scene.y * canvas.height - buffer,
        scene.w * canvas.width + buffer * 2,
        scene.h * canvas.height + buffer * 2,
      );
    });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    replaceKeyGreen(frame.data, lctx.getImageData(0, 0, layer.width, layer.height).data);
    ctx.putImageData(frame, 0, 0);
  }, [info, sceneCount]);

  useEffect(() => {
    if (!playing) return;
    let handle = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video) {
        if (video.currentTime >= endAt) {
          video.pause();
          video.currentTime = endAt;
        }
        setTime(video.currentTime);
        draw();
      }
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [playing, draw, endAt]);

  useEffect(() => {
    draw();
    const pending = Array.from({ length: sceneCount }, (_, i) => samplePhotoImage(i)).filter((image) => !image.complete);
    pending.forEach((image) => image.addEventListener('load', draw));
    return () => pending.forEach((image) => image.removeEventListener('load', draw));
  }, [draw, sceneCount]);

  useEffect(() => {
    startedRef.current = false;
    setPlaying(false);
    setTime(0);
  }, [templateId]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    if (!startedRef.current || video.currentTime >= endAt - 0.05) video.currentTime = 0;
    startedRef.current = true;
    void video.play();
  };

  const seekTo = (fraction: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(endAt, Math.max(0, fraction * endAt));
  };

  if (failed) return null;

  return (
    <Wrap>
      <Title>{t.livePreview}</Title>
      <Screen ref={canvasRef} width={CANVAS_WIDTH} height={height} style={{ width: CANVAS_WIDTH, height }} />
      {info && (
        <HiddenVideo
          key={info.id}
          ref={videoRef}
          src={`/api/collage/templates/${info.id}/video`}
          preload="metadata"
          playsInline
          onLoadedMetadata={(e) => {
            const firstScene = info.scenes[0];
            if (!startedRef.current && firstScene) e.currentTarget.currentTime = firstScene.startSec + POSTER_INTO_SCENE_SEC;
          }}
          onLoadedData={draw}
          onSeeked={() => { setTime(videoRef.current?.currentTime ?? 0); draw(); }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      )}
      <Controls>
        <PlayButton type="button" onClick={togglePlay} disabled={!info} aria-label={playing ? t.pause : t.play}>
          {playing ? <PauseIcon /> : <PlayIcon />}
        </PlayButton>
        <Bar
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seekTo((e.clientX - rect.left) / rect.width);
          }}
        >
          <Fill style={{ width: `${endAt ? Math.min(100, (time / endAt) * 100) : 0}%` }} />
        </Bar>
        <Clock>{info ? `${formatSeconds(time)} / ${formatSeconds(endAt)}` : t.previewLoading}</Clock>
      </Controls>
      {info && <Info>{t.builtInInfo(sceneCount, endAt.toFixed(1))}</Info>}
      {info && photoCount > info.scenes.length && <Warn>{t.builtInTooMany(info.scenes.length)}</Warn>}
    </Wrap>
  );
}
