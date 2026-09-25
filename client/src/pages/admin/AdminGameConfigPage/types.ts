export interface OrderRound {
  title: string;
  cards: string[];
}

export interface OrderScoring {
  firstAttemptPoints: number;
  retryPoints: number;
  speedBonus: boolean;
  timeLimitSeconds: number;
}

export interface TriviaAnswer {
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface TriviaQuestion {
  text: string;
  hint: string;
  media: string;
  answers: TriviaAnswer[];
}

export interface TriviaScoring {
  correctAnswerPoints: number;
  wrongAnswerPenalty: number;
  timeLimitSeconds: number;
}

export interface PuzzleAnswer {
  text: string;
  isCorrect: boolean;
}

export interface PuzzleQuestion {
  text: string;
  media: string;
  answers: PuzzleAnswer[];
  timeLimitSeconds?: number;
}

export interface PuzzleScoring {
  basePoints: number;
  speedBonusMax: number;
  timeLimitSeconds: number;
}

export interface TrueFalseStatement {
  text: string;
  media: string;
  isTrue: boolean;
}

export interface TrueFalseScoring {
  correctPoints: number;
  wrongPenalty: number;
  timeLimitSeconds: number;
}

export interface BallGameAnswer {
  text: string;
  isCorrect: boolean;
}

export interface BallGameQuestion {
  text: string;
  answers: BallGameAnswer[];
}

export interface BallGameScoring {
  timeLimitSeconds: number;
}

export interface TrashSortBin {
  id: string;
  label: string;
  color: string;
  iconUrl?: string;
}

export interface TrashSortItem {
  id: string;
  label: string;
  imageUrl: string;
  correctBinId: string;
}

export interface TrashSortScoring {
  correctPoints: number;
}

export interface GameData {
  _id: string;
  name: string;
  type: string;
  description?: string;
  customer?: string;
  theme?: string;
  tags?: string[];
  settings: Record<string, unknown>;
}

export interface GameConfigHandle {
  getSettings: () => Record<string, unknown>;
  validate: () => string | null;
  fillRandom?: () => void;
}
