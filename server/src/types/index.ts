// Login field types (what participants fill in)
export type LoginField = 'email' | 'phoneNumber' | 'name';

// Connection type (how participants connect)
export type ConnectionType = 'single' | 'group';

// Group config
export interface GroupConfig {
  name: string;
}

// Admin types
export type AdminRole = 'viewer' | 'admin' | 'super_admin' | 'customer';

export interface AdminJwtPayload {
  email: string;
  role: AdminRole;
  userId: string;
  iat?: number;
  exp?: number;
}

// Manager types
export interface ManagerJwtPayload {
  email: string;
  activityCode: string;
  activityId: string;
  role: 'manager';
  iat?: number;
  exp?: number;
}

export interface ManagerLoginRequest {
  activityCode: string;
  email: string;
  password: string;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  admin: { email: string; role: AdminRole; name?: string };
}

// Popup message config (sent from client)
export interface PopupTriggerConfig {
  point: 'afterLogin' | 'beforeItem' | 'afterItem' | 'endOfActivity';
  itemIndex?: number;
}

export interface PopupConditionConfig {
  type: 'participantCount';
  threshold: number;
}

export interface PopupMessageConfig {
  title: string;
  contentType: 'text' | 'image';
  text?: string;
  image?: string;
  includeUsername?: boolean;
  trigger: PopupTriggerConfig;
  condition?: PopupConditionConfig;
  enabled: boolean;
}

// Module item config (sent from client)
export interface ModuleItemRequest {
  type: 'game' | 'station';
  ref: string; // ObjectId string
  groups?: string[]; // when set, only these groups see this item
}

// Module config (sent from client)
export interface ModuleConfigRequest {
  type: 'story' | 'mission';
  backgroundImage?: string;
  items: ModuleItemRequest[]; // ordered mix of games and stations
  popups?: PopupMessageConfig[];
  missionRef?: string; // ObjectId string for mission reference
}

// ─── Order Game Settings ───

export interface OrderGameRound {
  title?: string;        // question/prompt for this round (optional)
  cards: string[];       // items in CORRECT order (shuffled at runtime for participant)
}

export interface OrderGameScoringConfig {
  firstAttemptPoints: number;   // points for correct on first try (default 100)
  retryPoints: number;          // points for correct on retry (default 50)
  speedBonus: boolean;          // bonus for fast completion
  timeLimitSeconds?: number;    // optional time limit per round
}

export interface OrderGameSettings {
  instructions?: string;         // opening instructions text
  rounds: OrderGameRound[];      // list of rounds
  scoring: OrderGameScoringConfig;
}

// ─── Trivia Game Settings ───

export interface TriviaAnswer {
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface TriviaQuestion {
  text: string;
  hint?: string;
  media?: string;
  answers: TriviaAnswer[];
}

export interface TriviaScoringConfig {
  correctAnswerPoints: number;
  wrongAnswerPenalty: number;
  /** Seconds allowed for each question (timer resets every question; not a whole-game cap). 0 or omit = no limit. */
  timeLimitSeconds?: number;
}

export interface TriviaGameSettings {
  instructions?: string;
  questions: TriviaQuestion[];
  scoring: TriviaScoringConfig;
  shuffleAnswers?: boolean;
  /** When true, players get one-time 1/2 or 3/4 wrong-answer elimination per game. */
  includeHelpers?: boolean;
}

// ─── Ball Game Settings ───

export interface BallGameAnswer {
  text: string;
  isCorrect: boolean;
}

export interface BallGameQuestion {
  text: string;
  answers: BallGameAnswer[]; // exactly 4, one correct
}

export interface BallGameSettings {
  instructions?: string;
  questions: BallGameQuestion[];
  scoring: { timeLimitSeconds: number };
}

// Game API types
export interface CreateGameRequest {
  name: string;
  type?: string;
  description?: string;
  customer?: string;
  theme?: string;
  tags?: string[];
  settings?: Record<string, unknown>;
}

// Station API types
export interface CreateStationRequest {
  name: string;
  type?: 'text' | 'video' | 'image';
  description?: string;
  customer?: string;
  theme?: string;
  tags?: string[];
  settings?: Record<string, unknown>;
}

// Opening config (optional splash screen before login)
export interface OpeningConfig {
  type: 'video' | 'image';
  url: string;
}

// Custom instructions for the guidelines popup
export interface CustomInstructionsConfig {
  title?: string;
  missionTitle?: string;
  missionItems?: string[];
  guidelinesTitle?: string;
  guidelineItems?: string[];
  buttonText?: string;
}

// Activity API types
export interface CreateActivityRequest {
  name: string;
  loginFields: LoginField[];
  emailGoogle?: boolean;
  connectionType: ConnectionType;
  groups?: GroupConfig[];
  opening?: OpeningConfig;
  module?: ModuleConfigRequest;
  guidelines?: string;
  customInstructions?: CustomInstructionsConfig;
  scheduledStart?: string;
  scheduledEnd?: string;
  managerEmail?: string;
  managerPassword?: string;
}

export interface ActivityConfigResponse {
  code: string;
  name: string;
  loginFields: LoginField[];
  emailGoogle?: boolean;
  connectionType: ConnectionType;
  groups: GroupConfig[];
  opening?: OpeningConfig;
  scheduledStart?: string;
  scheduledEnd?: string;
}

// Participant types
export interface JwtPayload {
  participantName: string;
  activityCode: string;
  connectionType: ConnectionType;
  email?: string;
  phoneNumber?: string;
  group?: string;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  activityCode: string;
  participantName?: string;
  email?: string;
  phoneNumber?: string;
  group?: string;
}

export interface LoginResponse {
  token: string;
  participant: {
    name: string;
    activityCode: string;
    connectionType: ConnectionType;
    email?: string;
    phoneNumber?: string;
    group?: string;
  };
}

declare global {
  namespace Express {
    interface Request {
      participant?: JwtPayload;
      admin?: AdminJwtPayload;
      manager?: ManagerJwtPayload;
    }
  }
}
