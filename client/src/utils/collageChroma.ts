const MIN_GREEN = 140;
const GREEN_OVER_RED = 50;
const GREEN_OVER_BLUE = 40;

export function isKeyGreen(r: number, g: number, b: number): boolean {
  return g >= MIN_GREEN && g - r >= GREEN_OVER_RED && g - b >= GREEN_OVER_BLUE;
}

export function replaceKeyGreen(frame: Uint8ClampedArray, layer: Uint8ClampedArray): void {
  for (let i = 0; i < frame.length; i += 4) {
    if (layer[i + 3] === 0 || !isKeyGreen(frame[i], frame[i + 1], frame[i + 2])) continue;
    frame[i] = layer[i];
    frame[i + 1] = layer[i + 1];
    frame[i + 2] = layer[i + 2];
  }
}
