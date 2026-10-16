import type { CSSProperties } from 'react';

const LIGHT_HALO = '0 0 2px rgba(255,255,255,0.95), 0 0 10px rgba(255,255,255,0.8)';
const DARK_LUMINANCE = 0.4;

function hexChannels(color: string): number[] | null {
  const hex = color.trim().replace(/^#/, '');
  const full = hex.length === 3 || hex.length === 4 ? hex.slice(0, 3).split('').map((c) => c + c).join('') : hex.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

export function isDarkColor(color: string): boolean {
  const channels = hexChannels(color);
  if (!channels) return false;
  const [r, g, b] = channels.map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < DARK_LUMINANCE;
}

export function themedTitleInk(textColor?: string): CSSProperties | undefined {
  if (!textColor) return undefined;
  if (!isDarkColor(textColor)) return { color: textColor };
  return { color: textColor, WebkitTextStroke: '0', textShadow: LIGHT_HALO };
}
