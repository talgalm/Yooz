export type LoginField = 'email' | 'phoneNumber' | 'name';

export type ConnectionType = 'single' | 'group';

export type GroupEntryMode = 'preset' | 'selfService';

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

export type AdminRole = 'viewer' | 'admin' | 'super_admin' | 'customer';

export interface AdminJwtPayload {
  email: string;
  role: AdminRole;
  userId: string;
  iat?: number;
  exp?: number;
}

export interface ManagerJwtPayload {
  email: string;
  activityCode: string;
  activityId: string;
  role: 'manager';
  iat?: number;
  exp?: number;
}

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

export interface CollageSplitRequest {
  splitGroupId: string;
  partIndex: number;
  partSizes?: number[];
  totalParts?: number;
}

export interface ModuleItemRequest {
  type: 'game' | 'station' | 'mission';
  ref: string;
  groups?: string[];
  spiderSvg?: string;
  isFinal?: boolean;
  revisitable?: boolean;
  collageSplit?: CollageSplitRequest;
}

export interface ModuleConfigRequest {
  type: 'story' | 'mission' | 'spiders';
  backgroundImage?: string;
  items: ModuleItemRequest[];
  popups?: PopupMessageConfig[];
  missionRef?: string;
}

export interface OrderGameRound {
  title?: string;
  cards: string[];
}

export interface OrderGameScoringConfig {
  firstAttemptPoints: number;
  retryPoints: number;
  speedBonus: boolean;
  timeLimitSeconds?: number;
}

export interface OrderGameSettings {
  mode?: 'quiz' | 'survey';
  instructions?: string;
  rounds: OrderGameRound[];
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
  timeLimitSeconds?: number;
}

export interface TriviaGameSettings {
  instructions?: string;
  questions: TriviaQuestion[];
  scoring: TriviaScoringConfig;
  shuffleAnswers?: boolean;
  includeHelpers?: boolean;
}

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
  questions: BallGameQuestion[];
  scoring: { timeLimitSeconds: number };
}

export interface CreateGameRequest {
  name: string;
  type?: string;
  description?: string;
  customer?: string;
  theme?: string;
  tags?: string[];
  settings?: Record<string, unknown>;
}

export interface PortalUserRequest {
  username: string;
  password: string;
}

export interface CreatePortalRequest {
  name: string;
  description?: string;
  users?: PortalUserRequest[];
  activities?: string[];
}

export interface CreateStationRequest {
  name: string;
  type?: 'text' | 'video' | 'image' | 'narrative' | 'badge' | 'collage' | 'feedback' | 'riddle' | 'avatar' | 'avatarQuiz' | 'enteringText';
  description?: string;
  customer?: string;
  theme?: string;
  tags?: string[];
  settings?: Record<string, unknown>;
}

export interface OpeningConfig {
  type: 'video' | 'image';
  url: string;
}

export interface CustomInstructionsConfig {
  title?: string;
  missionTitle?: string;
  missionItems?: string[];
  guidelinesTitle?: string;
  guidelineItems?: string[];
  buttonText?: string;
}

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
  languages?: string[];
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
  userControl?: boolean;
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
  languages?: string[];
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
  helpCategoriesDisabled?: string[];
  helpCategoryResponses?: Record<string, string>;
  helpOtherCategoryEnabled?: boolean;
}

export interface JwtPayload {
  participantName: string;
  activityCode: string;
  reportId?: string;
  dailyReset?: boolean;
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
