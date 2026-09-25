import { Schema, model, Types } from 'mongoose';

export interface IMapGroupState {
  _id?: Types.ObjectId;
  activityId: Types.ObjectId;
  activityCode: string;
  groupName: string;
  activityDay: string;

  completedIndices: number[];
  score: number;
  startedAt: Date;
  completedAt?: Date;

  position?: { lat: number; lng: number };
  positionAt?: Date;
  positionCarrierReportId?: Types.ObjectId;
}

const mapGroupStateSchema = new Schema<IMapGroupState>({
  activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true, index: true },
  activityCode: { type: String, required: true, index: true },
  groupName: { type: String, required: true },
  activityDay: { type: String, required: true, index: true },

  completedIndices: { type: [Number], default: [] },
  score: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },

  position: {
    type: new Schema({
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    }, { _id: false }),
    default: undefined,
  },
  positionAt: { type: Date },
  positionCarrierReportId: { type: Schema.Types.ObjectId, ref: 'Report' },
});

mapGroupStateSchema.index({ activityId: 1, activityDay: 1, groupName: 1 }, { unique: true });

export const MapGroupState = model<IMapGroupState>('MapGroupState', mapGroupStateSchema, 'map_group_states');
