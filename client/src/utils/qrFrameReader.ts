import jsQR from 'jsqr';

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

const MAX_DECODE_WIDTH = 640;

export interface QrFrameReader {
  read(video: HTMLVideoElement): Promise<string | null>;
}

function nativeDetector(): BarcodeDetectorInstance | null {
  const Detector = (globalThis as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
  if (!Detector) return null;
  try {
    return new Detector({ formats: ['qr_code'] });
  } catch {
    return null;
  }
}

export function createQrFrameReader(): QrFrameReader {
  let detector = nativeDetector();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  const readWithJsQr = (video: HTMLVideoElement): string | null => {
    if (!context || !video.videoWidth || !video.videoHeight) return null;
    const scale = Math.min(1, MAX_DECODE_WIDTH / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
  };

  return {
    async read(video) {
      if (detector) {
        try {
          const found = await detector.detect(video);
          return found[0]?.rawValue ?? null;
        } catch {
          detector = null;
        }
      }
      return readWithJsQr(video);
    },
  };
}
