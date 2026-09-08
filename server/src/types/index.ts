// Login field types (what participants fill in)
export type LoginField = 'email' | 'phoneNumber' | 'name';

// Connection type (how participants connect)
export type ConnectionType = 'single' | 'group';

export type GroupEntryMode = 'preset' | 'selfService';

// Group config
export interface GroupConfig {
  name: string;
}

export interface GroupStatusResponse {
  memberCount: number;
  minMembers: number;
  canProceed: boolean;
  completedCount: number;
  allMembersCompleted: boolean;
}

export interface GroupRewardConfig {
  enabled: boolean;
  couponCode: string;
  messageTemplate?: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'pdf';
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

// Yooz-Manage types (/manage realm)
export interface ManageJwtPayload {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'pm' | 'member';
  realm: 'manage';
  iat?: number;
  exp?: number;
}

export interface ManageLoginRequest {
  email: string;
  password: string;
}

export interface ManagerLoginRequest {
  activityCode: string;
  email?: string;
  password?: string;
  googleAccessToken?: string;
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
export interface CollageSplitRequest {
  splitGroupId: string;
  partIndex: number;
  partSizes?: number[];
  totalParts?: number; // legacy fallback
}

export interface ModuleItemRequest {
  type: 'game' | 'station' | 'mission';
  ref: string; // ObjectId string
  groups?: string[]; // when set, only these groups see this item
  spiderSvg?: string;
  isFinal?: boolean;
  revisitable?: boolean; // completed item stays re-openable from the roadmap
  collageSplit?: CollageSplitRequest;
}

// Module config (sent from client)
export interface ModuleConfigRequest {
  type: 'story' | 'mission' | 'spiders';
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
  /** 'quiz' = correct order + scoring (default). 'survey' = class ranking poll, no scoring. */
  mode?: 'quiz' | 'survey';
  instructions?: string;         // opening instructions text
  rounds: OrderGameRound[];      // list of rounds
  scoring: OrderGameScoringConfig;
}

export interface OrderSurveyAggregatedItem {
  item: string;
  bordaScore: number;
  rank: number;
}

export interface OrderSurveySession {
  itemIndex: number;
  gameId: string;
  roundIndex: number;
  phase: 'voting' | 'results';
  resultsRevealed: boolean;
  aggregatedRanking?: OrderSurveyAggregatedItem[];
  updatedAt: Date;
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

// Portal API types
export interface PortalUserRequest {
  username: string;
  password: string;
}

export interface CreatePortalRequest {
  name: string;
  description?: string;
  users?: PortalUserRequest[];
  activities?: string[]; // Activity ObjectId strings
}

// Station API types
export interface CreateStationRequest {
  name: string;
  type?: 'text' | 'video' | 'image' | 'narrative' | 'badge' | 'collage' | 'feedback' | 'riddle' | 'avatar' | 'avatarQuiz' | 'enteringText';
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
  groupEntryMode?: GroupEntryMode;
  groups?: GroupConfig[];
  opening?: OpeningConfig | null;
  module?: ModuleConfigRequest;
  guidelines?: string;
  extraSupportInfo?: string;
  organizerContactName?: string;
  organizerContactPhone?: string;
  helpCategoriesDisabled?: string[];
  helpCategoryResponses?: Record<string, string>;
  helpOtherCategoryEnabled?: boolean;
  customInstructions?: CustomInstructionsConfig;
  scheduledStart?: string;
  scheduledEnd?: string;
  managerEmail?: string;
  managerPassword?: string;
  isContinuous?: boolean;
  portalId?: string;
  leaderboardMode?: 'points' | 'time' | 'both';
  leaderboardAsGrade?: boolean;
  hideLeaderboardInHeader?: boolean;
  leaderboardCurrentDayOnly?: boolean;
  dailyReset?: boolean;
  activityDurationMinutes?: number;
  roadmapTimerMinutes?: number;
  includeOnRoadmap?: boolean;
  passThreshold?: number | null;
  groupMinMembers?: number;
  groupMaxMembers?: number;
  groupReward?: GroupRewardConfig;
  smsForCollage?: boolean;
  smsForCollageMessage?: string;
  smsForCollageShare?: boolean;
}

export interface ActivityConfigResponse {
  code: string;
  name: string;
  loginFields: LoginField[];
  emailGoogle?: boolean;
  connectionType: ConnectionType;
  groupEntryMode?: GroupEntryMode;
  groups: GroupConfig[];
  opening?: OpeningConfig;
  scheduledStart?: string;
  scheduledEnd?: string;
  isContinuous?: boolean;
  organizerContactName?: string;
  organizerContactPhone?: string;
  /** Help-chat FAQ menu categories hidden for this activity. Absent/empty = show all. */
  helpCategoriesDisabled?: string[];
  /** Per-category custom FAQ answer text, keyed the same as helpCategoriesDisabled. */
  helpCategoryResponses?: Record<string, string>;
  /** The "something else" open free-text chat — opt-in, absent/false = hidden. */
  helpOtherCategoryEnabled?: boolean;
}

// Participant types
export interface JwtPayload {
  participantName: string;
  activityCode: string;
  /** The report this session owns. Absent on tokens issued before it existed. */
  reportId?: string;
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
  groupToken?: string;
}

export interface CreateGroupRequest {
  name: string;
  participantName?: string;
  phoneNumber?: string;
  email?: string;
}

export interface CreateGroupResponse {
  token: string;
  participant: LoginResponse['participant'];
  group: {
    name: string;
    inviteToken: string;
    inviteUrl: string;
  };
  groupStatus?: GroupStatusResponse;
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
  groupStatus?: GroupStatusResponse;
}

declare global {
  namespace Express {
    interface Request {
      participant?: JwtPayload;
      admin?: AdminJwtPayload;
      manager?: ManagerJwtPayload;
      manageUser?: ManageJwtPayload;
    }
  }
}
