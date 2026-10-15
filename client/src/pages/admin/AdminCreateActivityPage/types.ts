import type { MapDesign } from '../../../utils/mapDesign';

export type LoginField = 'email' | 'phoneNumber' | 'name';
export type ConnectionType = 'single' | 'group';
export type GroupEntryMode = 'preset' | 'selfService';
export type ModuleType = 'none' | 'story' | 'spiders' | 'map';

export function isWizardModule(t: ModuleType): boolean {
  return t !== 'none';
}

export interface ItemLocation {
  lat: number;
  lng: number;
  address?: string;
  placeName?: string;
}
export type OpeningType = 'none' | 'video' | 'image';
export type TriggerPoint = 'afterLogin' | 'beforeItem' | 'afterItem' | 'endOfActivity';
export type ConditionType = 'none' | 'participantCount';
export type PopupContentType = 'text' | 'image' | 'video';

export interface PopupMessage {
  title: string;
  contentType: PopupContentType;
  text: string;
  image: string;
  video: string;
  sound?: string;
  soundCustom?: boolean;
  includeUsername: boolean;
  triggerPoint: TriggerPoint;
  itemIndex: number;
  itemUid?: string;
  byStep?: boolean;
  onTheWay?: boolean;
  conditionType: ConditionType;
  threshold: number;
  groups: string[];
  routes: number[];
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
  type: 'text' | 'video' | 'image' | 'narrative' | 'badge' | 'collage' | 'feedback' | 'riddle' | 'avatar' | 'avatarQuiz' | 'enteringText';
  description?: string;
  customer?: string;
  theme?: string;
  settings: Record<string, unknown>;
}

export interface CollageSplit {
  splitGroupId: string;
  partIndex: number;
  partSizes: number[];
  totalParts?: number;
  videoPartIndex?: number | null;
  photoOrder?: number[];
  videoOrder?: number[];
  partName?: string;
  partDescription?: string;
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
  groups?: string[];
  spiderSvg?: string;
  isFinal?: boolean;
  revisitable?: boolean;
  openAnywhere?: boolean;
  collageSplit?: CollageSplit;
  location?: ItemLocation;
  mapIcon?: string;
  cipherChar?: string;
  uid?: string;
}

export function itemDisplayName(item: Pick<ModuleItem, 'name' | 'collageSplit'>): string {
  return item.collageSplit?.partName?.trim() || item.name;
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
  smsForCollageShare?: boolean;
  opening?: { type: 'video' | 'image'; url: string };
  module?: {
    type: string;
    theme?: string;
    backgroundImage?: string;
    missionRef?: string;
    showStationNumbers?: boolean;
    showItemTitleNumbers?: boolean;
    groupOrders?: Record<string, number[]>;
    routes?: { name: string; order: number[] }[];
    groupRoutes?: Record<string, number>;
    startLocation?: ItemLocation;
    proximityMeters?: number;
    mapDesign?: Partial<MapDesign>;
    openAnywhere?: boolean;
    showStationNames?: boolean;
    cipherEnabled?: boolean;
    items: { type: 'game' | 'station'; ref: string; groups?: string[]; collageSplit?: CollageSplit; location?: ItemLocation; mapIcon?: string; cipherChar?: string; data?: { _id: string; name: string; type?: string; settings?: Record<string, unknown>; description?: string; customer?: string; theme?: string } }[];
    popups?: {
      _id?: string;
      title: string;
      contentType?: string;
      text?: string;
      image?: string;
      video?: string;
      sound?: string;
      includeUsername?: boolean;
      trigger: { point: string; itemIndex?: number; byStep?: boolean; onTheWay?: boolean };
      condition?: { type: string; threshold: number };
      groups?: string[];
      routes?: number[];
      enabled: boolean;
    }[];
  };
  guidelines?: string;
  languages?: string[];
  defaultLanguage?: string;
  extraSupportInfo?: string;
  organizerContacts?: { name: string; phone: string }[];
  organizerContactName?: string;
  organizerContactPhone?: string;
  helpCategoriesDisabled?: string[];
  helpCategoryResponses?: Record<string, string>;
  helpOtherCategoryEnabled?: boolean;
  customInstructions?: CustomInstructions;
  scheduledStart?: string;
  scheduledEnd?: string;
  managerEmail?: string;
  userControl?: boolean;
  isContinuous?: boolean;
  portalId?: string;
  folderId?: string | null;
  includeOnRoadmap?: boolean;
  hideLeaderboardInHeader?: boolean;
  leaderboardAllGroups?: boolean;
  leaderboardCurrentDayOnly?: boolean;
  dailyReset?: boolean;
  leaderboardAsGrade?: boolean;
  leaderboardMode?: 'points' | 'time' | 'both';
  activityDurationMinutes?: number;
  roadmapTimerMinutes?: number | null;
}
