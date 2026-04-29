export interface GameData {
  _id: string;
  name: string;
  type: string;
  settings: Record<string, unknown>;
}

export interface GameItemData {
  type: 'game';
  _id: string;
  name: string;
  gameType: string; // 'order', 'trivia', 'puzzle', 'trueFalse'
  description?: string;
  settings: Record<string, unknown>;
  spiderSvg?: string;
}

export interface StationItemData {
  type: 'station';
  _id: string;
  name: string;
  stationType: 'text' | 'video' | 'image' | 'narrative' | 'badge' | 'collage' | 'feedback' | 'riddle' | 'avatar' | 'enteringText';
  description?: string;
  settings?: Record<string, unknown>;
  spiderSvg?: string;
}

export interface MissionScreen {
  header?: string;
  description?: string;
  buttonText?: string;
  image?: string;
  backgroundImage?: string;
}

export interface MissionPuzzleConfig {
  completeHeader?: string;
  completeButton?: string;
}

export interface MissionTrashSortConfig {
  title?: string;
  description?: string;
  scoreLabel?: string;
  gameFinalText?: string;
  completeHeader?: string;
  completeButton?: string;
  badgeHeader?: string;
  badgeCurveText?: string;
  badgeAwardText?: string;
  badgeAchievementText?: string;
  shareButton?: string;
  continueButton?: string;
}

export interface MissionItemData {
  type: 'mission';
  _id: string;
  name: string;
  explanationScreens: MissionScreen[];
  puzzleConfig?: MissionPuzzleConfig;
  trashSortConfig?: MissionTrashSortConfig;
  spiderSvg?: string;
}

export type ModuleItemData = GameItemData | StationItemData | MissionItemData;

export interface PopupData {
  _id: string;
  title: string;
  contentType?: 'text' | 'image';
  text?: string;
  image?: string;
  includeUsername?: boolean;
  trigger: {
    point: 'afterLogin' | 'beforeItem' | 'afterItem' | 'endOfActivity';
    itemIndex?: number;
  };
}

export interface CustomThemeData {
  mainColor: string;
  roadmapImage?: string;
  stationsImage?: string;
  textColor?: string;
  bgColor?: string;
  roadmapActiveNodeColor?: string;
  roadmapPathColor?: string;
}

export interface ModuleData {
  type: string;
  theme?: string;
  customTheme?: CustomThemeData;
  backgroundImage?: string;
  items: ModuleItemData[];
  popups?: PopupData[];
  showStationNumbers?: boolean;
}

export interface CustomInstructionsData {
  title?: string;
  missionTitle?: string;
  missionItems?: string[];
  guidelinesTitle?: string;
  guidelineItems?: string[];
  buttonText?: string;
}

export interface ActivityModuleResponse {
  code: string;
  name: string;
  module: ModuleData;
  guidelines?: string;
  customInstructions?: CustomInstructionsData;
  isContinuous?: boolean;
  leaderboardMode?: 'points' | 'time';
  activityDurationMinutes?: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  group?: string;
  score: number;
  durationMs?: number;
}

export type Phase = 'roadmap' | 'playing' | 'summary' | 'finish' | 'leaderboard';

export interface GameScore {
  itemIndex: number;
  gameName: string;
  score: number;
}

export interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotation: number;
}
