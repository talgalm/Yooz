const MIN_GREEN = 140;
const GREEN_OVER_RED = 50;
const GREEN_OVER_BLUE = 40;

export function isKeyGreen(r: number, g: number, b: number): boolean {
  return g >= MIN_GREEN && g - r >= GREEN_OVER_RED && g - b >= GREEN_OVER_BLUE;
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function chroma(r: number, g: number, b: number): [number, number] {
  return [-0.169 * r - 0.331 * g + 0.5 * b + 128, 0.5 * r - 0.419 * g - 0.081 * b + 128];
}

export function chromaDistance(r: number, g: number, b: number, key: [number, number, number]): number {
  const [u, v] = chroma(r, g, b);
  const [ku, kv] = chroma(key[0], key[1], key[2]);
  return Math.sqrt(((u - ku) ** 2 + (v - kv) ** 2) / (255 * 255 * 2));
}

export function replaceKeyColor(frame: Uint8ClampedArray, layer: Uint8ClampedArray, keyHex: string, similarity: number): void {
  const key = hexToRgb(keyHex);
  for (let i = 0; i < frame.length; i += 4) {
    if (layer[i + 3] === 0 || chromaDistance(frame[i], frame[i + 1], frame[i + 2], key) >= similarity) continue;
    const a = layer[i + 3] / 255;
    frame[i] = frame[i] * (1 - a) + layer[i] * a;
    frame[i + 1] = frame[i + 1] * (1 - a) + layer[i + 1] * a;
    frame[i + 2] = frame[i + 2] * (1 - a) + layer[i + 2] * a;
  }
}

export function replaceKeyGreen(frame: Uint8ClampedArray, layer: Uint8ClampedArray): void {
  for (let i = 0; i < frame.length; i += 4) {
    if (layer[i + 3] === 0 || !isKeyGreen(frame[i], frame[i + 1], frame[i + 2])) continue;
    frame[i] = layer[i];
    frame[i + 1] = layer[i + 1];
    frame[i + 2] = layer[i + 2];
  }
}
