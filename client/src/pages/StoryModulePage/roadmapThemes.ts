import type { RoadmapDecoration } from './roadmapTrees';

export interface RoadmapThemeKit {
  containerBg: string;
  headerGradient: string;
  headerBorder: string;
  sceneBgTop: string;
  sceneBgMid: string;
  sceneBgBottom: string;
  roadBorder: string;
  roadSurface: string;
  roadCenterLine: string;
  nodeActiveBorder: string;
  nodeActiveBg: string;
  nodeCompletedBorder: string;
  nodeCompletedBg: string;
  nodeLockedBorder: string;
  nodeLockedBg: string;
  nodeNumberColor: string;
  nodeLabelColor: string;
  nodeLabelShadow: string;
  pulseRingColor: string;
  showFish: boolean;
  showClouds: boolean;
  showTumbleweed: boolean;
  showHouses: boolean;
  showSideWaves: boolean;
  decorationCategories: string[];
}

// ─── Nature (default) ───

export const NATURE_THEME: RoadmapThemeKit = {
  containerBg: '#8fb247',
  headerGradient: 'linear-gradient(135deg, rgba(45,80,22,0.92) 0%, rgba(56,100,30,0.88) 100%)',
  headerBorder: 'rgba(255,255,255,0.08)',
  sceneBgTop: '#8fb248',
  sceneBgMid: '#8fb248',
  sceneBgBottom: '#8fb248',
  roadBorder: '#2a1a0a',
  roadSurface: '#3A291A',
  roadCenterLine: 'rgba(255,255,255,.14)',
  nodeActiveBorder: '#6c5ce7',
  nodeActiveBg: '#d4e84e',
  nodeCompletedBorder: '#1e4d24',
  nodeCompletedBg: '#d4e84e',
  nodeLockedBorder: '#a0a080',
  nodeLockedBg: '#c8cc88',
  nodeNumberColor: '#fff',
  nodeLabelColor: '#fff',
  nodeLabelShadow: '0 1px 4px rgba(0,0,0,.6)',
  pulseRingColor: 'rgba(180,210,50,.5)',
  showFish: false,
  showClouds: true,
  showTumbleweed: false,
  showHouses: true,
  showSideWaves: true,
  decorationCategories: ['Trees', 'Bushes', 'Grass', 'Rocks', 'Water', 'Clouds', 'Shadows'],
};

// ─── Ocean ───

export const OCEAN_THEME: RoadmapThemeKit = {
  containerBg: '#428bad',
  headerGradient: 'linear-gradient(135deg, rgba(34,72,98,0.94) 0%, rgba(50,105,140,0.90) 100%)',
  headerBorder: 'rgba(255,255,255,0.10)',
  sceneBgTop: '#428bad',
  sceneBgMid: '#428bad',
  sceneBgBottom: '#428bad',
  roadBorder: '#5A4020',
  roadSurface: '#C4A86A',
  roadCenterLine: 'rgba(255,255,255,.18)',
  nodeActiveBorder: '#1B8EC4',
  nodeActiveBg: '#5ED4F5',
  nodeCompletedBorder: '#0d4d38',
  nodeCompletedBg: '#5ED4F5',
  nodeLockedBorder: '#5A8898',
  nodeLockedBg: '#7FAAB8',
  nodeNumberColor: '#fff',
  nodeLabelColor: '#E0F4FF',
  nodeLabelShadow: '0 1px 4px rgba(0,0,0,.5)',
  pulseRingColor: 'rgba(94,212,245,.5)',
  showFish: true,
  showClouds: false,
  showTumbleweed: false,
  showHouses: false,
  showSideWaves: true,
  decorationCategories: ['Coral', 'Seaweed', 'OceanRocks', 'Bubbles'],
};

// ─── Desert ───

export const DESERT_THEME: RoadmapThemeKit = {
  containerBg: '#c9983a',
  headerGradient: 'linear-gradient(135deg, rgba(120,70,20,0.94) 0%, rgba(150,90,30,0.90) 100%)',
  headerBorder: 'rgba(255,255,255,0.08)',
  sceneBgTop: '#c9983a',
  sceneBgMid: '#c9983a',
  sceneBgBottom: '#c9983a',
  roadBorder: '#3A2510',
  roadSurface: '#6B4F30',
  roadCenterLine: 'rgba(255,255,255,.12)',
  nodeActiveBorder: '#C87020',
  nodeActiveBg: '#F0C860',
  nodeCompletedBorder: '#2d4a22',
  nodeCompletedBg: '#F0C860',
  nodeLockedBorder: '#A09070',
  nodeLockedBg: '#C8B888',
  nodeNumberColor: '#fff',
  nodeLabelColor: '#FFF8E8',
  nodeLabelShadow: '0 1px 4px rgba(0,0,0,.5)',
  pulseRingColor: 'rgba(240,200,96,.5)',
  showFish: false,
  showClouds: false,
  showTumbleweed: true,
  showHouses: false,
  showSideWaves: true,
  decorationCategories: ['Cactus', 'DesertRocks', 'SandDunes', 'DesertPlants'],
};

export function getThemeKit(theme?: string): RoadmapThemeKit {
  switch (theme) {
    case 'ocean':  return OCEAN_THEME;
    case 'desert': return DESERT_THEME;
    default:       return NATURE_THEME;
  }
}

// ─── Ocean decorations ───

export const OCEAN_DECORATIONS: RoadmapDecoration[] = [

  {
    name: 'Tall seaweed',
    category: 'Seaweed',
    viewBoxWidth: 60,
    viewBoxHeight: 160,
    svg: `<svg viewBox="0 0 60 160" xmlns="http://www.w3.org/2000/svg">
<path d="M30,158 Q26,140 22,120 Q18,100 22,80 Q26,60 24,40 Q22,20 28,8 Q32,2 34,8 Q38,20 36,40 Q34,60 38,80 Q42,100 38,120 Q34,140 30,158 Z" fill="#2D8B5A"/>
<path d="M22,120 Q14,105 10,90 Q8,75 14,62 Q18,72 16,85 Q18,98 22,110" fill="#38A068" opacity="0.7"/>
<path d="M38,110 Q46,95 50,80 Q52,65 46,52 Q42,62 44,75 Q42,88 38,100" fill="#38A068" opacity="0.7"/>
<path d="M24,60 Q16,48 12,38 Q18,44 22,52" fill="#42B078" opacity="0.5"/>
<path d="M36,50 Q44,38 48,28 Q42,34 38,42" fill="#42B078" opacity="0.5"/>
</svg>`,
  },
  {
    name: 'Short seaweed',
    category: 'Seaweed',
    viewBoxWidth: 50,
    viewBoxHeight: 100,
    svg: `<svg viewBox="0 0 50 100" xmlns="http://www.w3.org/2000/svg">
<path d="M25,98 Q22,85 20,72 Q18,58 20,44 Q22,30 24,18 Q26,12 28,18 Q30,30 28,44 Q26,58 28,72 Q30,85 25,98 Z" fill="#248050"/>
<path d="M20,72 Q14,60 12,48 Q16,55 18,64" fill="#2C9060" opacity="0.6"/>
<path d="M28,64 Q34,52 36,40 Q32,48 30,56" fill="#2C9060" opacity="0.6"/>
</svg>`,
  },
  {
    name: 'Ocean rock',
    category: 'OceanRocks',
    viewBoxWidth: 80,
    viewBoxHeight: 55,
    svg: `<svg viewBox="0 0 80 55" xmlns="http://www.w3.org/2000/svg">
<path d="M10,48 Q4,40 8,30 Q14,18 28,14 Q40,10 54,12 Q68,16 74,26 Q78,36 72,44 Q64,50 48,52 Q28,52 10,48 Z" fill="#4A6878"/>
<path d="M28,14 Q40,10 54,12 Q68,16 74,26 Q62,18 48,16 Q34,16 24,22 Z" fill="#5A7888" opacity="0.5"/>
<path d="M36,18 Q48,14 60,18 Q50,22 40,22 Z" fill="#6A8898" opacity="0.35"/>
</svg>`,
  },
  {
    name: 'Bubble cluster',
    category: 'Bubbles',
    viewBoxWidth: 50,
    viewBoxHeight: 60,
    svg: `<svg viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg">
<circle cx="25" cy="35" r="10" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
<circle cx="22" cy="30" r="3" fill="rgba(255,255,255,0.15)"/>
<circle cx="15" cy="20" r="7" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="0.8"/>
<circle cx="13" cy="17" r="2" fill="rgba(255,255,255,0.12)"/>
<circle cx="35" cy="15" r="5" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.8"/>
<circle cx="33" cy="13" r="1.5" fill="rgba(255,255,255,0.12)"/>
<circle cx="30" cy="48" r="4" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="0.6"/>
<circle cx="10" cy="45" r="3" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.6"/>
</svg>`,
  },
  {
    name: 'Shell',
    category: 'OceanRocks',
    viewBoxWidth: 45,
    viewBoxHeight: 40,
    svg: `<svg viewBox="0 0 45 40" xmlns="http://www.w3.org/2000/svg">
<path d="M22,4 Q36,4 40,20 Q42,30 36,36 Q28,40 18,38 Q8,34 4,24 Q2,14 10,8 Q16,4 22,4 Z" fill="#F0D8B0"/>
<path d="M22,6 Q20,14 18,22 Q16,28 14,34" stroke="#D8C098" stroke-width="1" fill="none"/>
<path d="M22,6 Q24,14 26,22 Q28,28 30,34" stroke="#D8C098" stroke-width="1" fill="none"/>
<path d="M22,6 Q22,16 22,26 Q22,32 22,38" stroke="#D8C098" stroke-width="0.8" fill="none"/>
<path d="M22,4 Q30,6 36,14 Q40,22 40,30" stroke="#D8C098" stroke-width="0.8" fill="none" opacity="0.5"/>
</svg>`,
  },
  {
    name: 'Anchor',
    category: 'Anchor',
    viewBoxWidth: 60,
    viewBoxHeight: 60,
    svg: `<img src="/images/anchor.svg" alt="" style="width:100%;height:100%;display:block;opacity:0.85" />`,
  },
];

// ─── Desert decorations ───

export const DESERT_DECORATIONS: RoadmapDecoration[] = [
  {
    name: 'Tall cactus',
    category: 'Cactus',
    viewBoxWidth: 80,
    viewBoxHeight: 180,
    svg: `<svg viewBox="0 0 80 180" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="40" cy="175" rx="20" ry="4" fill="#8B7030" opacity="0.2"/>
<rect x="34" y="50" width="12" height="128" rx="6" fill="#4A8B3A"/>
<rect x="36" y="52" width="3" height="124" rx="1.5" fill="#5AA84A" opacity="0.4"/>
<path d="M34,100 L20,100 Q12,100 12,92 L12,72 Q12,64 20,64 L20,64 Q20,72 20,80 L20,92 Q20,98 26,100 Z" fill="#4A8B3A"/>
<rect x="14" y="66" width="3" height="30" rx="1.5" fill="#5AA84A" opacity="0.35"/>
<path d="M46,80 L60,80 Q68,80 68,72 L68,56 Q68,48 60,48 L60,48 Q60,56 60,64 L60,72 Q60,78 54,80 Z" fill="#4A8B3A"/>
<rect x="63" y="50" width="3" height="26" rx="1.5" fill="#5AA84A" opacity="0.35"/>
<ellipse cx="40" cy="48" rx="8" ry="4" fill="#5AA84A" opacity="0.3"/>
</svg>`,
  },
  {
    name: 'Round cactus',
    category: 'Cactus',
    viewBoxWidth: 60,
    viewBoxHeight: 70,
    svg: `<svg viewBox="0 0 60 70" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="30" cy="66" rx="18" ry="3" fill="#8B7030" opacity="0.15"/>
<ellipse cx="30" cy="42" rx="22" ry="26" fill="#4A8B3A"/>
<ellipse cx="30" cy="42" rx="18" ry="22" fill="#5A9B4A" opacity="0.4"/>
<path d="M18,30 L18,60" stroke="#3A7B2A" stroke-width="0.8" opacity="0.3"/>
<path d="M24,24 L24,62" stroke="#3A7B2A" stroke-width="0.8" opacity="0.3"/>
<path d="M30,20 L30,64" stroke="#3A7B2A" stroke-width="0.8" opacity="0.3"/>
<path d="M36,24 L36,62" stroke="#3A7B2A" stroke-width="0.8" opacity="0.3"/>
<path d="M42,30 L42,60" stroke="#3A7B2A" stroke-width="0.8" opacity="0.3"/>
<circle cx="30" cy="22" r="4" fill="#F0E040" opacity="0.7"/>
<circle cx="30" cy="22" r="2" fill="#F8F060" opacity="0.5"/>
</svg>`,
  },
  {
    name: 'Small cactus',
    category: 'Cactus',
    viewBoxWidth: 40,
    viewBoxHeight: 90,
    svg: `<svg viewBox="0 0 40 90" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="20" cy="87" rx="10" ry="2.5" fill="#8B7030" opacity="0.15"/>
<rect x="16" y="25" width="8" height="63" rx="4" fill="#4A8B3A"/>
<rect x="17.5" y="27" width="2" height="59" rx="1" fill="#5AA84A" opacity="0.35"/>
<path d="M16,55 L10,55 Q6,55 6,50 L6,42 Q6,37 10,37 Q10,42 10,47 Q10,53 14,55 Z" fill="#4A8B3A"/>
<path d="M24,45 L30,45 Q34,45 34,40 L34,34 Q34,29 30,29 Q30,34 30,39 Q30,43 26,45 Z" fill="#4A8B3A"/>
</svg>`,
  },
  {
    name: 'Desert rock 1',
    category: 'DesertRocks',
    viewBoxWidth: 80,
    viewBoxHeight: 50,
    svg: `<svg viewBox="0 0 80 50" xmlns="http://www.w3.org/2000/svg">
<path d="M8,44 Q2,38 6,28 Q12,16 26,12 Q38,8 52,10 Q66,14 74,24 Q78,32 74,40 Q66,46 50,48 Q30,48 14,46 Z" fill="#A08058"/>
<path d="M26,12 Q38,8 52,10 Q66,14 74,24 Q62,16 48,14 Q34,14 22,20 Z" fill="#B89068" opacity="0.5"/>
<path d="M34,16 Q46,12 58,16 Q48,20 38,20 Z" fill="#C8A078" opacity="0.35"/>
</svg>`,
  },
  {
    name: 'Desert rock 2',
    category: 'DesertRocks',
    viewBoxWidth: 60,
    viewBoxHeight: 45,
    svg: `<svg viewBox="0 0 60 45" xmlns="http://www.w3.org/2000/svg">
<path d="M6,40 Q2,34 8,24 Q16,14 30,10 Q44,8 52,16 Q58,24 54,34 Q48,42 36,44 Q20,44 6,40 Z" fill="#98784A"/>
<path d="M30,10 Q44,8 52,16 Q44,12 34,12 Q22,14 14,22 Z" fill="#A8885A" opacity="0.5"/>
</svg>`,
  },
  {
    name: 'Sand dune',
    category: 'SandDunes',
    viewBoxWidth: 140,
    viewBoxHeight: 50,
    svg: `<svg viewBox="0 0 140 50" xmlns="http://www.w3.org/2000/svg">
<path d="M0,48 Q20,30 50,22 Q80,16 110,22 Q130,30 140,48 Z" fill="#C8A040" opacity="0.4"/>
<path d="M10,48 Q30,34 60,28 Q90,24 120,32 Q136,40 140,48 Z" fill="#B89038" opacity="0.3"/>
<path d="M50,22 Q70,18 90,20 Q80,24 60,26 Z" fill="#D8B858" opacity="0.25"/>
</svg>`,
  },
  {
    name: 'Dry bush',
    category: 'DesertPlants',
    viewBoxWidth: 60,
    viewBoxHeight: 45,
    svg: `<svg viewBox="0 0 60 45" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="30" cy="42" rx="24" ry="3" fill="#8B7030" opacity="0.1"/>
<path d="M30,42 Q28,36 24,30 Q20,24 16,18 Q14,12 18,8" stroke="#8B7830" stroke-width="1.5" fill="none" stroke-linecap="round"/>
<path d="M30,42 Q32,34 36,28 Q40,22 44,16 Q46,10 42,6" stroke="#8B7830" stroke-width="1.5" fill="none" stroke-linecap="round"/>
<path d="M30,42 Q30,34 30,26 Q30,18 28,10" stroke="#8B7830" stroke-width="1.5" fill="none" stroke-linecap="round"/>
<path d="M24,30 Q18,28 12,30" stroke="#8B7830" stroke-width="1" fill="none" stroke-linecap="round"/>
<path d="M36,28 Q42,26 48,28" stroke="#8B7830" stroke-width="1" fill="none" stroke-linecap="round"/>
<circle cx="18" cy="7" r="2" fill="#9B8840" opacity="0.4"/>
<circle cx="42" cy="5" r="2" fill="#9B8840" opacity="0.4"/>
<circle cx="28" cy="9" r="1.5" fill="#9B8840" opacity="0.3"/>
</svg>`,
  },
  {
    name: 'Desert grass tuft',
    category: 'DesertPlants',
    viewBoxWidth: 45,
    viewBoxHeight: 35,
    svg: `<svg viewBox="0 0 45 35" xmlns="http://www.w3.org/2000/svg">
<path d="M12,33 Q10,26 8,18 Q12,24 14,28 Q13,20 14,10 Q16,18 16,26 Q18,16 22,8 Q21,18 20,28 Q24,20 28,12 Q26,22 24,30 Q28,24 34,18 Q30,26 26,33 Z" fill="#7A8838"/>
<path d="M14,32 Q12,24 12,16 Q14,22 16,28 Q16,20 18,12 Q18,22 18,28 Z" fill="#8A9848" opacity="0.5"/>
</svg>`,
  },
  {
    name: 'Sand ripple',
    category: 'SandDunes',
    viewBoxWidth: 100,
    viewBoxHeight: 30,
    svg: `<svg viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg">
<path d="M0,25 Q15,18 30,20 Q45,22 55,16 Q65,10 80,14 Q90,17 100,15" stroke="#B89838" stroke-width="1.5" fill="none" opacity="0.35"/>
<path d="M5,28 Q20,22 35,24 Q50,26 60,20 Q70,14 85,18 Q95,21 100,19" stroke="#B89838" stroke-width="1" fill="none" opacity="0.25"/>
</svg>`,
  },
];
