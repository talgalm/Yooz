export interface HintConfig {
  enabled: boolean;
  text: string;
  imageUrl?: string;
}

export interface QuestionAnswerRecord {
  questionIndex: number;
  questionText?: string;
  selectedAnswers: number[];
  correctAnswers: number[];
  isCorrect: boolean;
  pointsEarned: number;
  timeSpentMs: number;
}

export interface GameResult {
  score: number;
  maxPossibleScore: number;
  durationMs: number;
  hintUsed: boolean;
  questionAnswers?: QuestionAnswerRecord[];
  attempts?: number;
  metadata?: Record<string, unknown>;
}

export interface GameProps {
  game: {
    _id: string;
    name: string;
    type: string;
    settings: Record<string, unknown>;
  };
  onComplete: (result: GameResult) => void;
}

export const GAME_CONSTANTS = {
  HINT_PENALTY: 4,
  HINT_TIME_PENALTY_MS: 4 * 60 * 1000,
  SOLUTION_HINT_TIME_PENALTY_MS: 4 * 60 * 1000,
  FEEDBACK_DURATION_MS: 1500,
  TIMER_WARNING_SECONDS: 10,
  TIMER_CRITICAL_SECONDS: 3,
  PUZZLE_DEFAULT_TIME_LIMIT: 300,
  PUZZLE_DEFAULT_QUESTION_TIME_SECONDS: 10,
  FINISH_COUNTDOWN_SECONDS: 90,
  INCORRECT_FEEDBACK_DELAY_MS: 1500,
} as const;
