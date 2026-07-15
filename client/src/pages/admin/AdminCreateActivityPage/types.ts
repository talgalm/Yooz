export type LoginField = 'email' | 'phoneNumber' | 'name';
export type ConnectionType = 'single' | 'group';
export type GroupEntryMode = 'preset' | 'selfService';
export type ModuleType = 'none' | 'story' | 'spiders';
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
  type: 'text' | 'video' | 'image' | 'narrative' | 'badge' | 'collage' | 'feedback' | 'riddle' | 'avatar' | 'enteringText';
  description?: string;
  customer?: string;
  theme?: string;
  settings: Record<string, unknown>;
}

export interface CollageSplit {
  splitGroupId: string; // shared between all parts of the same split
  partIndex: number; // 0-based
  // Canonical per-part image counts. Length = number of parts in the group.
  // Sum = total image limit on the underlying station. Each entry is the
  // number of images that part of the split is responsible for.
  partSizes: number[];
  totalParts?: number; // legacy fallback, retained for older saved data
  /** Index of the part dedicated to video creation/sharing only (no photo capture).
   *  When set, partSizes[videoPartIndex] === 0. */
  videoPartIndex?: number | null;
  /** Optional permutation of station.settings.missions before slicing. */
  photoOrder?: number[];
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
  spiderSvg?: string; // optional SVG URL for spiders module display
  isFinal?: boolean; // spiders only: locked until all others are completed
  collageSplit?: CollageSplit; // collage stations only: split into N parts across the activity
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
  groupEntryMode?: GroupEntryMode;
  groups: { name: string }[];
  groupMinMembers?: number;
  groupMaxMembers?: number;
  groupReward?: { enabled: boolean; couponCode: string; messageTemplate?: string; attachmentUrl?: string; attachmentType?: 'image' | 'pdf' };
  smsForCollage?: boolean;
  smsForCollageMessage?: string;
  opening?: { type: 'video' | 'image'; url: string };
  module?: {
    type: string;
    theme?: string;
    backgroundImage?: string;
    missionRef?: string;
    showStationNumbers?: boolean;
    showItemTitleNumbers?: boolean;
    items: { type: 'game' | 'station'; ref: string; groups?: string[]; collageSplit?: CollageSplit; data?: { _id: string; name: string; type?: string; settings?: Record<string, unknown>; description?: string; customer?: string; theme?: string } }[];
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
  isContinuous?: boolean;
  portalId?: string;
  folderId?: string | null;
  includeOnRoadmap?: boolean;
  hideLeaderboardInHeader?: boolean;
  leaderboardCurrentDayOnly?: boolean;
  leaderboardAsGrade?: boolean;
}
