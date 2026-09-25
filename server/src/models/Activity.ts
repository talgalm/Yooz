import { Schema, model, Types } from 'mongoose';
import type { AnalyticsExportType } from '../utils/analyticsExcelExport';

export interface IPopupTrigger {
  point: 'afterLogin' | 'beforeItem' | 'afterItem' | 'endOfActivity';
  itemIndex?: number;
}

export interface ICollageSplit {
  splitGroupId: string;
  partIndex: number;
  partSizes: number[];
  totalParts?: number;
  videoPartIndex?: number | null;
  photoOrder?: number[];
}

export interface IItemLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface IModuleItem {
  type: 'game' | 'station' | 'mission';
  ref: Types.ObjectId;
  location?: IItemLocation;
  groups?: string[];
  spiderSvg?: string;
  isFinal?: boolean;
  revisitable?: boolean;
  collageSplit?: ICollageSplit;
}

export interface IPopupCondition {
  type: 'participantCount';
  threshold: number;
}

export interface IPopupMessage {
  _id?: Types.ObjectId;
  title: string;
  contentType: 'text' | 'image';
  text?: string;
  image?: string;
  includeUsername?: boolean;
  trigger: IPopupTrigger;
  condition?: IPopupCondition;
  enabled: boolean;
}

export interface IModuleConfig {
  type: 'story' | 'mission' | 'spiders' | 'map';
  theme?: string;
  backgroundImage?: string;
  items: IModuleItem[];
  popups?: IPopupMessage[];
  missionRef?: Types.ObjectId;
  showStationNumbers?: boolean;
  showItemTitleNumbers?: boolean;
  groupOrders?: Record<string, number[]>;
  proximityMeters?: number;
}

export type ActivityStatus = 'preview' | 'live';

export interface IOpening {
  type: 'video' | 'image';
  url: string;
}

export interface ICustomInstructions {
  title?: string;
  missionTitle?: string;
  missionItems?: string[];
  guidelinesTitle?: string;
  guidelineItems?: string[];
  buttonText?: string;
}

export interface IActivity {
  _id?: Types.ObjectId;
  code: string;
  name: string;
  status: ActivityStatus;
  loginFields: string[];
  emailGoogle?: boolean;
  connectionType: string;
  groupEntryMode?: 'preset' | 'selfService';
  groups: { name: string }[];
  opening?: IOpening;
  module?: IModuleConfig;
  guidelines?: string;
  languages?: string[];
  extraSupportInfo?: string;
  organizerContactName?: string;
  organizerContactPhone?: string;
  helpCategoriesDisabled?: string[];
  helpCategoryResponses?: Record<string, string>;
  helpOtherCategoryEnabled?: boolean;
  customInstructions?: ICustomInstructions;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  managerEmail?: string;
  managerPassword?: string;
  userControl?: boolean;
  stations: string[];
  createdAt: Date;
  createdByEmail?: string;
  customerEditLocked?: boolean;
  portalId?: Types.ObjectId;
  folderId?: Types.ObjectId | null;
  isContinuous?: boolean;
  loginComponent?: string;
  leaderboardMode?: 'points' | 'time' | 'both';
  leaderboardAsGrade?: boolean;
  hideLeaderboardInHeader?: boolean;
  leaderboardCurrentDayOnly?: boolean;
  dailyReset?: boolean;
  lastDailyResetDay?: string;
  activityDurationMinutes?: number;
  roadmapTimerMinutes?: number | null;
  passThreshold?: number | null;
  statsShareToken?: string | null;
  excludedReportIds?: Types.ObjectId[];
  shareClicks?: number;
  shareCompleted?: number;
  missionPuzzleCompletions?: number;
  missionTrashSortCompletions?: number;
  missionTrashSortScoreSum?: number;
  lockedFromIndex?: number | null;
  includeOnRoadmap?: boolean;
  orderSurveySession?: {
    itemIndex: number;
    gameId: string;
    roundIndex: number;
    phase: 'voting' | 'results';
    resultsRevealed: boolean;
    aggregatedRanking?: { item: string; bordaScore: number; rank: number }[];
    updatedAt: Date;
  };
  groupMinMembers?: number;
  groupMaxMembers?: number;
  smsForCollage?: boolean;
  smsForCollageMessage?: string;
  smsForCollageShare?: boolean;
  groupReward?: {
    enabled: boolean;
    couponCode: string;
    messageTemplate?: string;
    attachmentUrl?: string;
    attachmentType?: 'image' | 'pdf';
    downloadToken?: string;
  };
  scheduledReport?: IScheduledReport;
}

export interface IScheduledReport {
  enabled: boolean;
  reportType: AnalyticsExportType;
  recipients: string[];
  frequency: 'daily' | 'weekly';
  dayOfWeek?: number;
  scheduleHour: number;
  skipIfUnchanged: boolean;
  lastSentAt?: Date;
  lastSentSnapshot?: string;
}

function generateCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const popupTriggerSchema = new Schema({
  point: { type: String, required: true, enum: ['afterLogin', 'beforeItem', 'afterItem', 'endOfActivity'] },
  itemIndex: { type: Number },
}, { _id: false });

const popupConditionSchema = new Schema({
  type: { type: String, enum: ['participantCount'] },
  threshold: { type: Number },
}, { _id: false });

const popupMessageSchema = new Schema({
  title: { type: String, required: true },
  contentType: { type: String, enum: ['text', 'image'], default: 'text' },
  text: { type: String },
  image: { type: String },
  includeUsername: { type: Boolean, default: false },
  trigger: { type: popupTriggerSchema, required: true },
  condition: { type: popupConditionSchema },
  enabled: { type: Boolean, default: true },
});

const collageSplitSchema = new Schema<ICollageSplit>({
  splitGroupId: { type: String, required: true },
  partIndex: { type: Number, required: true },
  partSizes: { type: [Number], default: undefined },
  totalParts: { type: Number },
  videoPartIndex: { type: Number, default: null },
  photoOrder: { type: [Number], default: undefined },
}, { _id: false });

const itemLocationSchema = new Schema<IItemLocation>({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String },
}, { _id: false });

const moduleItemSchema = new Schema<IModuleItem>({
  type: { type: String, required: true, enum: ['game', 'station', 'mission'] },
  ref: { type: Schema.Types.ObjectId, required: true },
  groups: { type: [String], default: undefined },
  spiderSvg: { type: String },
  isFinal: { type: Boolean },
  revisitable: { type: Boolean },
  collageSplit: { type: collageSplitSchema },
  location: { type: itemLocationSchema },
}, { _id: false });

const moduleConfigSchema = new Schema<IModuleConfig>({
  type: { type: String, required: true, enum: ['story', 'mission', 'spiders', 'map'], default: 'story' },
  theme: { type: String },
  backgroundImage: { type: String },
  showStationNumbers: { type: Boolean, default: false },
  showItemTitleNumbers: { type: Boolean, default: false },
  items: { type: [moduleItemSchema], default: [] },
  popups: { type: [popupMessageSchema], default: [] },
  missionRef: { type: Schema.Types.ObjectId, ref: 'Mission' },
  groupOrders: { type: Schema.Types.Mixed, default: undefined },
  proximityMeters: { type: Number, default: undefined },
}, { _id: false });

const openingSchema = new Schema<IOpening>({
  type: { type: String, required: true, enum: ['video', 'image'] },
  url: { type: String, required: true },
}, { _id: false });

const customInstructionsSchema = new Schema<ICustomInstructions>({
  title: { type: String },
  missionTitle: { type: String },
  missionItems: { type: [String], default: undefined },
  guidelinesTitle: { type: String },
  guidelineItems: { type: [String], default: undefined },
  buttonText: { type: String },
}, { _id: false });

const activitySchema = new Schema<IActivity>({
  code: { type: String, required: true, unique: true, default: generateCode },
  name: { type: String, required: true },
  status: { type: String, enum: ['preview', 'live'], default: 'preview' },
  loginFields: { type: [String], default: [] },
  emailGoogle: { type: Boolean },
  connectionType: { type: String, required: true, enum: ['single', 'group'], default: 'single' },
  groupEntryMode: { type: String, enum: ['preset', 'selfService'] },
  groups: { type: [{ name: { type: String, required: true } }], default: [] },
  opening: { type: openingSchema },
  module: { type: moduleConfigSchema },
  guidelines: { type: String },
  languages: { type: [String], default: undefined },
  extraSupportInfo: { type: String },
  organizerContactName: { type: String },
  organizerContactPhone: { type: String },
  helpCategoriesDisabled: { type: [String], default: undefined },
  helpCategoryResponses: { type: Schema.Types.Mixed, default: undefined },
  helpOtherCategoryEnabled: { type: Boolean, default: false },
  customInstructions: { type: customInstructionsSchema },
  scheduledStart: { type: Date },
  scheduledEnd: { type: Date },
  managerEmail: { type: String },
  managerPassword: { type: String },
  userControl: { type: Boolean, default: false },
  stations: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  createdByEmail: { type: String, lowercase: true, trim: true },
  customerEditLocked: { type: Boolean, default: false },
  portalId: { type: Schema.Types.ObjectId, ref: 'Portal' },
  folderId: { type: Schema.Types.ObjectId, ref: 'ActivityFolder', default: null, index: true },
  isContinuous: { type: Boolean, default: false },
  loginComponent: { type: String },
  leaderboardMode: { type: String, enum: ['points', 'time', 'both'], default: 'points' },
  leaderboardAsGrade: { type: Boolean, default: false },
  hideLeaderboardInHeader: { type: Boolean, default: false },
  leaderboardCurrentDayOnly: { type: Boolean, default: true },
  dailyReset: { type: Boolean, default: false },
  lastDailyResetDay: { type: String },
  activityDurationMinutes: { type: Number },
  roadmapTimerMinutes: { type: Number },
  passThreshold: { type: Number, default: 70 },
  statsShareToken: { type: String, default: null, index: true, sparse: true },
  excludedReportIds: { type: [Schema.Types.ObjectId], default: [] },
  shareClicks: { type: Number, default: 0 },
  shareCompleted: { type: Number, default: 0 },
  missionPuzzleCompletions: { type: Number, default: 0 },
  missionTrashSortCompletions: { type: Number, default: 0 },
  missionTrashSortScoreSum: { type: Number, default: 0 },
  lockedFromIndex: { type: Number, default: null },
  includeOnRoadmap: { type: Boolean, default: false },
  orderSurveySession: { type: Schema.Types.Mixed, default: undefined },
  groupMinMembers: { type: Number, default: 1 },
  groupMaxMembers: { type: Number, default: null },
  smsForCollage: { type: Boolean, default: false },
  smsForCollageMessage: { type: String },
  smsForCollageShare: { type: Boolean, default: false },
  groupReward: {
    type: new Schema({
      enabled: { type: Boolean, default: false },
      couponCode: { type: String, default: '' },
      messageTemplate: { type: String },
      attachmentUrl: { type: String },
      attachmentType: { type: String, enum: ['image', 'pdf'] },
      downloadToken: { type: String, index: true, sparse: true },
    }, { _id: false }),
    default: undefined,
  },
  scheduledReport: {
    type: new Schema({
      enabled: { type: Boolean, default: false },
      reportType: { type: String, enum: ['executive', 'participants', 'scores', 'progress'], default: 'executive' },
      recipients: { type: [String], default: [] },
      frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
      dayOfWeek: { type: Number, min: 0, max: 6 },
      scheduleHour: { type: Number, min: 0, max: 23, default: 8 },
      skipIfUnchanged: { type: Boolean, default: false },
      lastSentAt: { type: Date },
      lastSentSnapshot: { type: String },
    }, { _id: false }),
    default: undefined,
  },
});

export const Activity = model<IActivity>('Activity', activitySchema, 'activities');
