import type { LevelConfig, LevelTheme, WallConfig } from './types';

const purpleWalls: WallConfig[] = [
  { x: 0.69, y: 0.95, width: 0.35, height: 0.02 },
  { x: 0.04, y: 0.85, width: 0.02, height: 0.22 },
  { x: 0.36, y: 0.80, width: 0.02, height: 0.28 },
  { x: 0.29, y: 0.85, width: 0.02, height: 0.22 },
];

const orangeWalls: WallConfig[] = [
  { x: 0.50, y: 0.82, width: 0.35, height: 0.02, angle: 0.175 },
  { x: 0.92, y: 0.85, width: 0.02, height: 0.22 },
  { x: 0.64, y: 0.85, width: 0.02, height: 0.22 },
];

const greenWalls: WallConfig[] = [
  { x: 0.35, y: 0.83, width: 0.02, height: 0.25, angle: -0.087 },
  { x: 0.65, y: 0.80, width: 0.02, height: 0.25, angle: 0.087 },
];

export const LEVEL_CONFIGS: Record<LevelTheme, LevelConfig> = {
  purple: {
    theme: 'purple',
    bgImage: '/images/ballgame/wall_purple.png',
    basketImage: '/images/ballgame/basket_purple.png',
    basketOverlayImage: '/images/ballgame/basket_purple_overlay.png',
    boxImage: '/images/ballgame/box_purple.png',
    bucketAnimImage: '/images/ballgame/bucket_purple_anim.png',
    walls: purpleWalls,
    basketPosition: { x: 0.82, y: 0.88 },
    ballSpawn: { x: 0.5, y: 0.55 },
  },
  orange: {
    theme: 'orange',
    bgImage: '/images/ballgame/wall_orange.png',
    basketImage: '/images/ballgame/basket_orange.png',
    basketOverlayImage: '/images/ballgame/basket_orange_overlay.png',
    boxImage: '/images/ballgame/box_orange.png',
    bucketAnimImage: '/images/ballgame/bucket_orange_anim.png',
    walls: orangeWalls,
    basketPosition: { x: 0.82, y: 0.88 },
    ballSpawn: { x: 0.5, y: 0.55 },
  },
  green: {
    theme: 'green',
    bgImage: '/images/ballgame/wall_green.png',
    basketImage: '/images/ballgame/basket_green.png',
    basketOverlayImage: '/images/ballgame/basket_green_overlay.png',
    boxImage: '/images/ballgame/box_green.png',
    bucketAnimImage: '/images/ballgame/bucket_green_anim.png',
    walls: greenWalls,
    basketPosition: { x: 0.50, y: 0.88 },
    ballSpawn: { x: 0.5, y: 0.55 },
  },
};

export function getLevelForQuestion(index: number): LevelTheme {
  if (index < 2) return 'purple';
  if (index < 6) return 'orange';
  return 'green';
}
