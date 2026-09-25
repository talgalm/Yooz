
export interface FolderColor {
  id: string;
  hex: string;
  accent: string;
}

export const FOLDER_COLORS: FolderColor[] = [
  { id: 'lavender', hex: '#E7E3FA', accent: '#8B7ED8' },
  { id: 'sky', hex: '#E3F2FD', accent: '#5B9BD5' },
  { id: 'mint', hex: '#E4F5E9', accent: '#5FB07A' },
  { id: 'lemon', hex: '#FBF3C4', accent: '#C9A227' },
  { id: 'peach', hex: '#FCE7D6', accent: '#D98E5A' },
  { id: 'rose', hex: '#FCE0E4', accent: '#D57A8C' },
  { id: 'aqua', hex: '#D7F2EE', accent: '#4FB3A5' },
  { id: 'slate', hex: '#E7E9EF', accent: '#7A8195' },
];

export const DEFAULT_FOLDER_COLOR = FOLDER_COLORS[0].hex;

export function resolveFolderColor(hex?: string | null): FolderColor {
  return FOLDER_COLORS.find((c) => c.hex === hex) ?? FOLDER_COLORS[0];
}
