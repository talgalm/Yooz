const SAMPLE_COLORS = ['#E63946', '#F77F00', '#06A77D', '#118AB2', '#7209B7', '#FCBF49', '#EF476F', '#26547C', '#2A9D8F', '#8338EC', '#FB5607', '#3A86FF'];
const SAMPLE_WIDTH = 300;
const SAMPLE_HEIGHT = 400;

const urls = new Map<number, string>();
const images = new Map<number, HTMLImageElement>();

export function sampleColor(index: number): string {
  return SAMPLE_COLORS[index % SAMPLE_COLORS.length];
}

export function samplePhotoUrl(index: number): string {
  const cached = urls.get(index);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_WIDTH;
  canvas.height = SAMPLE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = sampleColor(index);
  ctx.fillRect(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(SAMPLE_HEIGHT * 0.45)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(index + 1), SAMPLE_WIDTH / 2, SAMPLE_HEIGHT / 2);
  const url = canvas.toDataURL('image/png');
  urls.set(index, url);
  return url;
}

export function samplePhotoImage(index: number): HTMLImageElement {
  const cached = images.get(index);
  if (cached) return cached;
  const image = new Image();
  image.src = samplePhotoUrl(index);
  images.set(index, image);
  return image;
}
