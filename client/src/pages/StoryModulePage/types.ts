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
}

export interface StationItemData {
  type: 'station';
  _id: string;
  name: string;
  stationType: 'text' | 'video' | 'image' | 'narrative' | 'badge';
  description?: string;
  settings?: Record<string, unknown>;
}

export interface MissionScreen {
  header?: string;
  description?: string;
  buttonText?: string;
  image?: string;
  backgroundImage?: string;
}

export interface MissionItemData {
  type: 'mission';
  _id: string;
  name: string;
  explanationScreens: MissionScreen[];
}

export type ModuleItemData = GameItemData | StationItemData | MissionItemData;

export interface PopupData {
  _id: string;
  title: string;
  contentType?: 'text' | 'image';
  text?: string;
  image?: string;
  trigger: {
    point: 'afterLogin' | 'beforeItem' | 'afterItem' | 'endOfActivity';
    itemIndex?: number;
  };
}

export interface ModuleData {
  type: string;
  theme?: string;
  backgroundImage?: string;
  items: ModuleItemData[];
  popups?: PopupData[];
}

export interface ActivityModuleResponse {
  code: string;
  name: string;
  module: ModuleData;
  questionMode?: 'same' | 'byAge';
  guidelines?: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  group?: string;
  score: number;
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
