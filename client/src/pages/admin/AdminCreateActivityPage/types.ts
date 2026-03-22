export type LoginField = 'email' | 'phoneNumber' | 'name';
export type ConnectionType = 'single' | 'group';
export type ModuleType = 'none' | 'story';
export type QuestionMode = 'same' | 'byAge';
export type OpeningType = 'none' | 'video' | 'image';
export type TriggerPoint = 'afterLogin' | 'beforeItem' | 'afterItem' | 'endOfActivity';
export type ConditionType = 'none' | 'participantCount';
export type PopupContentType = 'text' | 'image';

export interface AgeRange {
  label: string;
  minAge: number;
  maxAge: number;
}

export interface PopupMessage {
  title: string;
  contentType: PopupContentType;
  text: string;
  image: string;
  triggerPoint: TriggerPoint;
  itemIndex: number;
  conditionType: ConditionType;
  threshold: number;
  enabled: boolean;
}

export interface GameOption {
  _id: string;
  name: string;
  type: string;
  description?: string;
  customer?: string;
  theme?: string;
  settings: Record<string, unknown>;
}

export interface StationOption {
  _id: string;
  name: string;
  type: 'text' | 'video' | 'image' | 'narrative' | 'badge';
  description?: string;
  customer?: string;
  theme?: string;
  settings: Record<string, unknown>;
}

export interface ModuleItem {
  itemType: 'game' | 'station' | 'mission';
  ref: string;
  name: string;
  subType?: string;
  description?: string;
  customer?: string;
  theme?: string;
  settings?: Record<string, unknown>;
}

export interface Activity {
  _id: string;
  name: string;
  loginFields: string[];
  emailGoogle?: boolean;
  connectionType: string;
  groups: { name: string }[];
  opening?: { type: 'video' | 'image'; url: string };
  module?: {
    type: string;
    theme?: string;
    backgroundImage?: string;
    missionRef?: string;
    items: { type: 'game' | 'station'; ref: string; data?: { _id: string; name: string; type?: string; settings?: Record<string, unknown>; description?: string; customer?: string; theme?: string } }[];
    popups?: {
      _id?: string;
      title: string;
      contentType?: string;
      text?: string;
      image?: string;
      trigger: { point: string; itemIndex?: number };
      condition?: { type: string; threshold: number };
      enabled: boolean;
    }[];
  };
  questionMode?: string;
  ageRanges?: AgeRange[];
  guidelines?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  managerEmail?: string;
}
