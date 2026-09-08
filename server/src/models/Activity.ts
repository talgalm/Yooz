import { Schema, model, Types } from 'mongoose';

export interface IPopupTrigger {
  point: 'afterLogin' | 'beforeItem' | 'afterItem' | 'endOfActivity';
  itemIndex?: number; // required when point is beforeItem/afterItem
}

export interface ICollageSplit {
  splitGroupId: string;
  partIndex: number;
  partSizes: number[];
  totalParts?: number; // legacy fallback
  /** Optional: index of the part dedicated to video creation/sharing only.
   *  When set, that part has partSizes[videoPartIndex] === 0 and the participant
   *  jumps straight to the result/share flow instead of capturing photos. */
  videoPartIndex?: number | null;
  /** Optional permutation of the underlying station.settings.missions indices.
   *  When set, the participant reorders the mission list before slicing into
   *  per-part chunks. Length = sum(partSizes excluding the video part). */
  photoOrder?: number[];
}

export interface IModuleItem {
  type: 'game' | 'station' | 'mission';
  ref: Types.ObjectId;
  groups?: string[]; // when set, only these groups see this item (empty/undefined = all groups)
  spiderSvg?: string; // optional SVG URL for spiders module display
  isFinal?: boolean; // spiders only: this item is locked until all others are completed
  revisitable?: boolean; // roadmap: participants may re-open this item after completing it
  collageSplit?: ICollageSplit; // collage stations only: split into N parts across the activity
}

export interface IPopupCondition {
  type: 'participantCount';
  threshold: number;
}

export interface IPopupMessage {
  _id?: Types.ObjectId;
  title: string;
  contentType: 'text' | 'image'; // text = show text, image = show image
  text?: string;
  image?: string; // image URL
  includeUsername?: boolean;
  trigger: IPopupTrigger;
  condition?: IPopupCondition;
  enabled: boolean;
}

export interface IModuleConfig {
  type: 'story' | 'mission' | 'spiders'; // module types
  theme?: string; // e.g. 'spy' – visual theme wrapper
  backgroundImage?: string; // URL or empty
  items: IModuleItem[]; // ordered mix of games and stations
  popups?: IPopupMessage[];
  missionRef?: Types.ObjectId; // reference to Mission document (when type='mission')
  showStationNumbers?: boolean; // spiders only: show station number in top-right of each node
  showItemTitleNumbers?: boolean; // show item index in in-station/game title (e.g. "3. ...")
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
  /** When connectionType is 'group': preset = admin-defined groups; selfService = participants create teams */
  groupEntryMode?: 'preset' | 'selfService';
  groups: { name: string }[];
  opening?: IOpening;
  module?: IModuleConfig;
  guidelines?: string;
  customInstructions?: ICustomInstructions;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  managerEmail?: string;
  managerPassword?: string; // bcrypt hash
  /** When true, exposes the /control/:id operator console for this activity */
  userControl?: boolean;
  /** Phones registered at the counter (normalized). Only consulted when userControl is on. */
  registeredPhones?: string[];
  stations: string[]; // legacy
  createdAt: Date;
  /** Set when created via admin API — used to scope customer role */
  createdByEmail?: string;
  /** When true, customer role cannot modify this activity */
  customerEditLocked?: boolean;
  /** Portal this activity is attached to */
  portalId?: Types.ObjectId;
  /** Admin-dashboard folder this activity is filed under (null = ungrouped). */
  folderId?: Types.ObjectId | null;
  /** When true, participants must login via portal username */
  isContinuous?: boolean;
  loginComponent?: string; // legacy
  /** Leaderboard scoring mode */
  leaderboardMode?: 'points' | 'time' | 'both';
  /** When true, leaderboard points are shown as a 0-100 grade (normalized
   *  against the activity's max possible score). Ignored in 'time' mode. */
  leaderboardAsGrade?: boolean;
  /** When true, hide the leaderboard trophy button from the session header */
  hideLeaderboardInHeader?: boolean;
  /** When true (default), leaderboard only includes reports completed today in Israel time */
  leaderboardCurrentDayOnly?: boolean;
  /** When true, all participant data is wiped at midnight Israel time each day */
  dailyReset?: boolean;
  /** Israel day (YYYY-MM-DD) the daily reset last ran / was armed on */
  lastDailyResetDay?: string;
  /** Optional time limit in minutes (only relevant when leaderboardMode is 'time') */
  activityDurationMinutes?: number;
  /** When set (> 0), shows a cosmetic count-up timer on the roadmap that turns red
   *  after this many minutes. Purely visual — does not affect play. null = off. */
  roadmapTimerMinutes?: number | null;
  /** Normalized (0-100) score at/above which a participant is considered to have
   *  passed, used in statistics and exported reports. Defaults to 70.
   *  null = no pass grade (pass/fail is not applied). */
  passThreshold?: number | null;
  /** Unguessable token for a public, read-only statistics share link.
   *  null/undefined = no active share link. */
  statsShareToken?: string | null;
  /** Report `_id`s excluded from all statistics, exports and the public share
   *  link. Non-destructive and reversible — the reports themselves are kept. */
  excludedReportIds?: Types.ObjectId[];
  /** Share button analytics */
  shareClicks?: number;
  shareCompleted?: number;
  /** Mission aggregate analytics */
  missionPuzzleCompletions?: number;
  missionTrashSortCompletions?: number;
  missionTrashSortScoreSum?: number;
  /** Manager-controlled progress lock — items with index >= this are blocked.
   *  null/undefined = nothing locked. */
  lockedFromIndex?: number | null;
  /** When true, show activity name on the story roadmap between header and path. */
  includeOnRoadmap?: boolean;
  /** Live order-game survey session (presenter + Borda aggregation). */
  orderSurveySession?: {
    itemIndex: number;
    gameId: string;
    roundIndex: number;
    phase: 'voting' | 'results';
    resultsRevealed: boolean;
    aggregatedRanking?: { item: string; bordaScore: number; rank: number }[];
    updatedAt: Date;
  };
  /** Self-service groups: minimum members before play can start (default 2). */
  groupMinMembers?: number;
  /** Self-service groups: maximum members allowed per group (0/undef = no cap). */
  groupMaxMembers?: number;
  /** When enabled, collage station shows a "get the video by SMS" button so the
   *  participant can skip the wait — server SMS's them the result when ready.
   *  Requires phoneNumber in loginFields. */
  smsForCollage?: boolean;
  /** Custom SMS body for collage-ready notification. Use {link} as a placeholder
   *  for the video URL; if absent the URL is appended on a new line. */
  smsForCollageMessage?: string;
  /** When true, the collage SMS {link} opens a share landing page (video + share button)
   *  instead of the raw video URL. */
  smsForCollageShare?: boolean;
  /** When enabled, highest-scoring group member gets an SMS coupon after all members finish. */
  groupReward?: {
    enabled: boolean;
    couponCode: string;
    messageTemplate?: string;
    attachmentUrl?: string;
    attachmentType?: 'image' | 'pdf';
    downloadToken?: string;
  };
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

const moduleItemSchema = new Schema<IModuleItem>({
  type: { type: String, required: true, enum: ['game', 'station', 'mission'] },
  ref: { type: Schema.Types.ObjectId, required: true },
  groups: { type: [String], default: undefined },
  spiderSvg: { type: String },
  isFinal: { type: Boolean },
  revisitable: { type: Boolean },
  collageSplit: { type: collageSplitSchema },
}, { _id: false });

const moduleConfigSchema = new Schema<IModuleConfig>({
  type: { type: String, required: true, enum: ['story', 'mission', 'spiders'], default: 'story' },
  theme: { type: String },
  backgroundImage: { type: String },
  showStationNumbers: { type: Boolean, default: false },
  showItemTitleNumbers: { type: Boolean, default: false },
  items: { type: [moduleItemSchema], default: [] },
  popups: { type: [popupMessageSchema], default: [] },
  missionRef: { type: Schema.Types.ObjectId, ref: 'Mission' },
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
  customInstructions: { type: customInstructionsSchema },
  scheduledStart: { type: Date },
  scheduledEnd: { type: Date },
  managerEmail: { type: String },
  managerPassword: { type: String },
  userControl: { type: Boolean, default: false },
  // ponytail: an array on the activity doc — move to its own collection if a
  // single activity ever registers tens of thousands of phones.
  registeredPhones: { type: [String], default: [] },
  stations: { type: [String], default: [] }, // legacy
  createdAt: { type: Date, default: Date.now },
  createdByEmail: { type: String, lowercase: true, trim: true },
  customerEditLocked: { type: Boolean, default: false },
  portalId: { type: Schema.Types.ObjectId, ref: 'Portal' },
  folderId: { type: Schema.Types.ObjectId, ref: 'ActivityFolder', default: null, index: true },
  isContinuous: { type: Boolean, default: false },
  loginComponent: { type: String }, // legacy
  leaderboardMode: { type: String, enum: ['points', 'time', 'both'], default: 'points' },
  leaderboardAsGrade: { type: Boolean, default: false },
  hideLeaderboardInHeader: { type: Boolean, default: false },
  leaderboardCurrentDayOnly: { type: Boolean, default: true },
  dailyReset: { type: Boolean, default: false },
  lastDailyResetDay: { type: String },
  activityDurationMinutes: { type: Number },
  roadmapTimerMinutes: { type: Number },
  passThreshold: { type: Number, default: 70 }, // null = no pass grade; range validated in code
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
});

export const Activity = model<IActivity>('Activity', activitySchema, 'activities');
