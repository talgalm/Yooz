/** Shared hint config stored in game.settings.hint */
export interface HintConfig {
  enabled: boolean;
  text: string;
}

/** Per-question answer tracking for analytics */
export interface QuestionAnswerRecord {
  questionIndex: number;
  questionText?: string;
  selectedAnswers: number[];
  correctAnswers: number[];
  isCorrect: boolean;
  pointsEarned: number;
  timeSpentMs: number;
}

/** Rich game result returned from onComplete for analytics tracking */
export interface GameResult {
  score: number;
  maxPossibleScore: number;
  durationMs: number;
  hintUsed: boolean;
  questionAnswers?: QuestionAnswerRecord[];
  attempts?: number;
  metadata?: Record<string, unknown>;
}

/** Shared game component props — all game components receive this shape */
export interface GameProps {
  game: {
    _id: string;
    name: string;
    type: string;
    settings: Record<string, unknown>;
  };
  onComplete: (result: GameResult) => void;
}

/** Magic numbers used across game components */
export const GAME_CONSTANTS = {
  /** Points deducted for using a hint */
  HINT_PENALTY: 4,
  /** Time added to elapsed duration for using a station hint in time mode (ms) */
  HINT_TIME_PENALTY_MS: 4 * 60 * 1000,
  /** Time added when using the EnteringText "show solution" hint (ms) */
  SOLUTION_HINT_TIME_PENALTY_MS: 4 * 60 * 1000,
  /** Feedback display duration default (ms) */
  FEEDBACK_DURATION_MS: 1500,
  /** Timer warning threshold (seconds) */
  TIMER_WARNING_SECONDS: 10,
  /** True/False timer critical threshold (seconds) */
  TIMER_CRITICAL_SECONDS: 3,
  /** Default time limit for puzzles (seconds) */
  PUZZLE_DEFAULT_TIME_LIMIT: 300,
  /** Per-question countdown when not set on the question (seconds); 0 on question = no limit */
  PUZZLE_DEFAULT_QUESTION_TIME_SECONDS: 10,
  /** Auto-exit countdown (seconds) */
  FINISH_COUNTDOWN_SECONDS: 90,
  /** Incorrect feedback display delay (ms) */
  INCORRECT_FEEDBACK_DELAY_MS: 1500,
} as const;
