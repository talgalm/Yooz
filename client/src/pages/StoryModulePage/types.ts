import type { LatLng } from '../../utils/geo';

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
  isFinal?: boolean;
  revisitable?: boolean;
  /** Map modules: where this station is on the ground. */
  location?: LatLng & { address?: string };
}

export interface CollageSplitData {
  splitGroupId: string;
  partIndex: number;
  partSizes: number[];
  totalParts?: number; // legacy fallback
  /** Index of the part dedicated to video creation only (no photo capture). */
  videoPartIndex?: number | null;
  /** Optional permutation of station.settings.missions before slicing. */
  photoOrder?: number[];
}

export interface StationItemData {
  type: 'station';
  _id: string;
  name: string;
  stationType: 'text' | 'video' | 'image' | 'narrative' | 'badge' | 'collage' | 'feedback' | 'riddle' | 'avatar' | 'avatarQuiz' | 'enteringText';
  description?: string;
  settings?: Record<string, unknown>;
  spiderSvg?: string;
  isFinal?: boolean;
  revisitable?: boolean;
  /** Map modules: where this station is on the ground. */
  location?: LatLng & { address?: string };
  collageSplit?: CollageSplitData;
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
  isFinal?: boolean;
  revisitable?: boolean;
  /** Map modules: where this station is on the ground. */
  location?: LatLng & { address?: string };
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
  headerIconColor?: string;
}

export interface ModuleData {
  type: string;
  theme?: string;
  customTheme?: CustomThemeData;
  backgroundImage?: string;
  items: ModuleItemData[];
  popups?: PopupData[];
  showStationNumbers?: boolean;
  showItemTitleNumbers?: boolean;
  /** Map modules: how close a participant must be for a station to open. */
  proximityMeters?: number;
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
  leaderboardMode?: 'points' | 'time' | 'both';
  leaderboardAsGrade?: boolean;
  hideLeaderboardInHeader?: boolean;
  activityDurationMinutes?: number;
  roadmapTimerMinutes?: number;
  lockedFromIndex?: number | null;
  includeOnRoadmap?: boolean;
  smsForCollage?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  group?: string;
  score: number;
  durationMs?: number;
}

export interface GroupLeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  /** Absent for map activities — their run document tracks no headcount. */
  members?: number;
  /** Map activities only: stations the team has finished. */
  completed?: number;
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

// ─── Map modules ────────────────────────────────────────────────────────────

/** Another team's marker, as seen from this participant's phone. */
export interface MapGroupMarker {
  groupName: string;
  score: number;
  completedCount: number;
  totalItems: number;
  position?: LatLng;
  positionAt?: string;
}

/** The caller's own group run — shared by every member of the team. */
export interface MapRunState {
  groupName: string;
  completedIndices: number[];
  currentItemIndex: number;
  score: number;
  totalItems: number;
  finished: boolean;
}
