import type { LatLng } from '../../utils/geo';
import type { MapDesign } from '../../utils/mapDesign';

export interface GameData {
  _id: string;
  name: string;
  type: string;
  settings: Record<string, unknown>;
}

export interface GameItemData {
  type: 'game';
  stationIndex?: number;
  _id: string;
  name: string;
  gameType: string;
  description?: string;
  settings: Record<string, unknown>;
  spiderSvg?: string;
  isFinal?: boolean;
  revisitable?: boolean;
  openAnywhere?: boolean;
  proximityMeters?: number;
  location?: LatLng & { address?: string; placeName?: string };
  mapIcon?: string;
  cipherChar?: string;
}

export interface CollageSplitData {
  splitGroupId: string;
  partIndex: number;
  partSizes: number[];
  totalParts?: number;
  videoPartIndex?: number | null;
  photoOrder?: number[];
  videoOrder?: number[];
  partName?: string;
  partDescription?: string;
  servedFirst?: boolean;
  servedFinale?: boolean;
}

export interface StationItemData {
  type: 'station';
  stationIndex?: number;
  _id: string;
  name: string;
  stationType: 'text' | 'video' | 'image' | 'narrative' | 'badge' | 'collage' | 'feedback' | 'riddle' | 'avatar' | 'avatarQuiz' | 'enteringText';
  description?: string;
  settings?: Record<string, unknown>;
  spiderSvg?: string;
  isFinal?: boolean;
  revisitable?: boolean;
  openAnywhere?: boolean;
  proximityMeters?: number;
  location?: LatLng & { address?: string; placeName?: string };
  mapIcon?: string;
  cipherChar?: string;
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
  stationIndex?: number;
  _id: string;
  name: string;
  explanationScreens: MissionScreen[];
  puzzleConfig?: MissionPuzzleConfig;
  trashSortConfig?: MissionTrashSortConfig;
  spiderSvg?: string;
  isFinal?: boolean;
  revisitable?: boolean;
  openAnywhere?: boolean;
  proximityMeters?: number;
  location?: LatLng & { address?: string; placeName?: string };
  mapIcon?: string;
  cipherChar?: string;
}

export type ModuleItemData = GameItemData | StationItemData | MissionItemData;

export interface PopupData {
  _id: string;
  title: string;
  contentType?: 'text' | 'image' | 'video';
  text?: string;
  image?: string;
  video?: string;
  sound?: string;
  includeUsername?: boolean;
  trigger: {
    point: 'afterLogin' | 'beforeItem' | 'afterItem' | 'endOfActivity';
    itemIndex?: number;
    onTheWay?: boolean;
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
  proximityMeters?: number;
  mapDesign?: MapDesign;
  openAnywhere?: boolean;
  showStationNames?: boolean;
  cipherEnabled?: boolean;
  cipherCode?: string;
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
  languages?: string[];
  guidelines?: string;
  customInstructions?: CustomInstructionsData;
  isContinuous?: boolean;
  leaderboardMode?: 'points' | 'time' | 'both';
  leaderboardAsGrade?: boolean;
  hideLeaderboardInHeader?: boolean;
  leaderboardAllGroups?: boolean;
  leaderboardGroupTotalsOnly?: boolean;
  leaderboardAutoOpen?: boolean;
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
  members?: number;
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
