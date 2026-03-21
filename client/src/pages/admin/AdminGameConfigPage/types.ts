export interface AgeRangeOption {
  minAge: number;
  maxAge: number;
}

export interface OrderRound {
  title: string;
  cards: string[];
  ageRange?: AgeRangeOption;
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
  ageRange?: AgeRangeOption;
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
  ageRange?: AgeRangeOption;
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
  ageRange?: AgeRangeOption;
}

export interface TrueFalseScoring {
  correctPoints: number;
  wrongPenalty: number;
  timeLimitSeconds: number;
}

// Ball game
export interface BallGameAnswer {
  text: string;
  isCorrect: boolean;
}

export interface BallGameQuestion {
  text: string;
  answers: BallGameAnswer[];
  ageRange?: AgeRangeOption;
}

export interface BallGameScoring {
  timeLimitSeconds: number;
}

// Trash sort game
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
  settings: Record<string, unknown>;
}

export interface GameConfigHandle {
  getSettings: () => Record<string, unknown>;
  validate: () => string | null;
  fillRandom?: () => void;
}
