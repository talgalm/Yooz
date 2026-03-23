import { Schema, model, Types } from 'mongoose';

export interface IPopupTrigger {
  point: 'afterLogin' | 'beforeItem' | 'afterItem' | 'endOfActivity';
  itemIndex?: number; // required when point is beforeItem/afterItem
}

export interface IModuleItem {
  type: 'game' | 'station' | 'mission';
  ref: Types.ObjectId;
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
  trigger: IPopupTrigger;
  condition?: IPopupCondition;
  enabled: boolean;
}

export interface IModuleConfig {
  type: 'story' | 'mission'; // module types
  theme?: string; // e.g. 'spy' – visual theme wrapper
  backgroundImage?: string; // URL or empty
  items: IModuleItem[]; // ordered mix of games and stations
  popups?: IPopupMessage[];
  missionRef?: Types.ObjectId; // reference to Mission document (when type='mission')
}

export interface IAgeRange {
  label: string;   // e.g. "Kids", "Teens", "Adults"
  minAge: number;
  maxAge: number;
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
  code: string;
  name: string;
  status: ActivityStatus;
  loginFields: string[];
  emailGoogle?: boolean;
  connectionType: string;
  groups: { name: string }[];
  opening?: IOpening;
  module?: IModuleConfig;
  questionMode: 'same' | 'byAge'; // default 'same'
  ageRanges: IAgeRange[];
  guidelines?: string;
  customInstructions?: ICustomInstructions;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  managerEmail?: string;
  managerPassword?: string; // bcrypt hash
  stations: string[]; // legacy
  createdAt: Date;
  loginComponent?: string; // legacy
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
  trigger: { type: popupTriggerSchema, required: true },
  condition: { type: popupConditionSchema },
  enabled: { type: Boolean, default: true },
});

const moduleItemSchema = new Schema<IModuleItem>({
  type: { type: String, required: true, enum: ['game', 'station', 'mission'] },
  ref: { type: Schema.Types.ObjectId, required: true },
}, { _id: false });

const moduleConfigSchema = new Schema<IModuleConfig>({
  type: { type: String, required: true, enum: ['story', 'mission'], default: 'story' },
  theme: { type: String },
  backgroundImage: { type: String },
  items: { type: [moduleItemSchema], default: [] },
  popups: { type: [popupMessageSchema], default: [] },
  missionRef: { type: Schema.Types.ObjectId, ref: 'Mission' },
}, { _id: false });

const ageRangeSchema = new Schema<IAgeRange>({
  label: { type: String, required: true },
  minAge: { type: Number, required: true },
  maxAge: { type: Number, required: true },
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
  groups: { type: [{ name: { type: String, required: true } }], default: [] },
  opening: { type: openingSchema },
  module: { type: moduleConfigSchema },
  questionMode: { type: String, enum: ['same', 'byAge'], default: 'same' },
  ageRanges: { type: [ageRangeSchema], default: [] },
  guidelines: { type: String },
  customInstructions: { type: customInstructionsSchema },
  scheduledStart: { type: Date },
  scheduledEnd: { type: Date },
  managerEmail: { type: String },
  managerPassword: { type: String },
  stations: { type: [String], default: [] }, // legacy
  createdAt: { type: Date, default: Date.now },
  loginComponent: { type: String }, // legacy
});

export const Activity = model<IActivity>('Activity', activitySchema, 'activities');
