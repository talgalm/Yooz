import type { HintConfig } from '../types';

export interface BallGameAnswer {
  text: string;
  isCorrect: boolean;
}

export interface BallGameQuestion {
  text: string;
  answers: BallGameAnswer[];
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
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
}

export interface LevelConfig {
  theme: LevelTheme;
  bgImage: string;
  basketImage: string;
  basketOverlayImage: string;
  boxImage: string;
  bucketAnimImage: string;
  walls: WallConfig[];
  basketPosition: { x: number; y: number };
  ballSpawn: { x: number; y: number };
}
