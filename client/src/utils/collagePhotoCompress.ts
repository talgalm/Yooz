const MAX_EDGE = 1080;
const JPEG_QUALITY = 0.85;

export async function compressPhotoForCollage(blob: Blob): Promise<Blob> {
  if (blob.type.startsWith('video/')) return blob;
  if (!blob.type.startsWith('image/')) return blob;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    return blob;
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return blob;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (out) => (out ? resolve(out) : reject(new Error('compress failed'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}
