import type { HintConfig } from '../types';

export interface BallGameAnswer {
  text: string;
  isCorrect: boolean;
}

export interface BallGameQuestion {
  text: string;
  answers: BallGameAnswer[];
  ageRange?: { minAge: number; maxAge: number };
}

export interface BallGameSettings {
  instructions?: string;
  hint?: HintConfig;
  questions: BallGameQuestion[];
  scoring: {
    timeLimitSeconds: number;
  };
}

export type BallGamePhase = 'instructions' | 'question' | 'throwing' | 'complete';

export type LevelTheme = 'purple' | 'orange' | 'green';

export interface WallConfig {
  x: number; // fraction of canvas width (0-1)
  y: number; // fraction of canvas height (0-1)
  width: number; // fraction of canvas width
  height: number; // fraction of canvas height
  angle?: number; // radians
}

export interface LevelConfig {
  theme: LevelTheme;
  bgImage: string;
  basketImage: string;
  basketOverlayImage: string;
  boxImage: string;
  bucketAnimImage: string;
  walls: WallConfig[];
  basketPosition: { x: number; y: number }; // fractions
  ballSpawn: { x: number; y: number }; // fractions
}
