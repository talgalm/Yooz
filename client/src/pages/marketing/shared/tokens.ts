
export const C = {
  shell: '#FFE8FF',
  paper: '#FFFAFF',
  paperSoft: '#FFF8FF',
  cardTint: '#FAF7FD',
  cardRule: '#F3E8FF',
  footer: '#F8F2FD',

  bandPeach: '#FFD9DA',
  bandLavender: '#D2CCEE',
  bandMint: '#DFF3CD',
  bandPink: '#FFE7FD',

  blobCream: '#FFF4D9',
  blobPurple: '#E8CBFF',

  vennEngage: '#E8D8FF',
  vennEngageEdge: '#C0A8D8',
  vennGrow: '#C0C8FF',
  vennGrowEdge: '#8088C0',
  vennShare: '#FFE8E8',
  vennShareEdge: '#F0D0E0',

  logo: '#721BA0',
  purple: '#6A0E9A',
  purpleDeep: '#7018A0',
  heading: '#380850',
  border: '#9048B0',

  magenta: '#E9479A',
  amber: '#FFC050',
  gold: '#FBBF24',
  discPink: '#F8C8C8',
  discMint: '#B8E888',
  discNumber: '#682890',

  ink: '#463A52',
  inkSoft: '#6B6480',
  white: '#FFFFFF',

  ruleWarm: '#FFECD9',
  ruleSoft: '#F3E8F6',
} as const;

export const CTA_GRADIENT =
  'linear-gradient(to right, #5C1B8B 0%, #7A21BC 32%, #A730BA 62%, #CB3DA9 82%, #E9479A 100%)';

export const HERO_FADE =
  'linear-gradient(to bottom, #FFE8FF 0%, #FFE8FF 58%, #FFEDFF 74%, #FFF3FF 86%, #FFFAFF 100%)';

export const SECTORS_GRADIENT =
  'linear-gradient(to bottom, #FFF8FF 0%, #FFF3FF 34%, #FFEDFF 66%, #FFE7FF 100%)';

export const SECTORS_GRADIENT_END = '#FFE7FF';

export const TEXT_GRADIENT = 'linear-gradient(to right, #7727BA 0%, #B038D0 45%, #E9479A 100%)';

export const SHADOW = {
  card: '0 4px 20px rgba(56,8,80,0.08)',
  cardHover: '0 10px 32px rgba(56,8,80,0.14)',
  float: '0 18px 48px rgba(56,8,80,0.16)',
  button: '0 6px 18px rgba(106,14,154,0.28)',
  quote: '0 10px 30px rgba(56,8,80,0.12)',
} as const;

export const RADIUS = {
  button: 10,
  field: 10,
  card: 16,
  cardLarge: 24,
  frame: 28,
  pill: 999,
} as const;

export const CONTAINER = 1356;
export const FRAME_WIDTH = 1512;

export const BP = {
  mobile: '@media (max-width: 700px)',
  tablet: '@media (max-width: 960px)',
  desktop: '@media (min-width: 961px)',
} as const;

export const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)';
