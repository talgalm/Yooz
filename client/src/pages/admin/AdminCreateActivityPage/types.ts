export type LoginField = 'email' | 'phoneNumber' | 'name';
export type ConnectionType = 'single' | 'group';
export type ModuleType = 'none' | 'story';
export type OpeningType = 'none' | 'video' | 'image';
export type TriggerPoint = 'afterLogin' | 'beforeItem' | 'afterItem' | 'endOfActivity';
export type ConditionType = 'none' | 'participantCount';
export type PopupContentType = 'text' | 'image';

export interface PopupMessage {
  title: string;
  contentType: PopupContentType;
  text: string;
  image: string;
  includeUsername: boolean;
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
  groups?: string[]; // when set, only these groups see this item
}

export interface CustomInstructions {
  title?: string;
  missionTitle?: string;
  missionItems?: string[];
  guidelinesTitle?: string;
  guidelineItems?: string[];
  buttonText?: string;
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
    items: { type: 'game' | 'station'; ref: string; groups?: string[]; data?: { _id: string; name: string; type?: string; settings?: Record<string, unknown>; description?: string; customer?: string; theme?: string } }[];
    popups?: {
      _id?: string;
      title: string;
      contentType?: string;
      text?: string;
      image?: string;
      includeUsername?: boolean;
      trigger: { point: string; itemIndex?: number };
      condition?: { type: string; threshold: number };
      enabled: boolean;
    }[];
  };
  guidelines?: string;
  customInstructions?: CustomInstructions;
  scheduledStart?: string;
  scheduledEnd?: string;
  managerEmail?: string;
}
