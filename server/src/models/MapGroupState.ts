import { Schema, model, Types } from 'mongoose';

/**
 * Shared run state for one group in a `map` module, for one Israel day.
 *
 * A map activity is walked by a *team*, not by individuals: the group has one
 * route, one progress index and one score, and whichever member reaches a
 * station first opens it for everyone. This document is that shared state — and
 * also the group's marker on every other group's map, so one doc serves
 * progress, position and the group leaderboard row.
 *
 * Day-scoped like ActivityGroup / PhoneRegistration: tomorrow's run of the same
 * activity starts clean while today's stays for reporting.
 */
export interface IMapGroupState {
  _id?: Types.ObjectId;
  activityId: Types.ObjectId;
  activityCode: string;
  groupName: string;
  activityDay: string;

  /** Every position in the group's own item list it has finished. The station
   *  the group is heading to is *derived* from this (first gap), never stored —
   *  so two members completing at once can't race over a progress counter. */
  completedIndices: number[];
  score: number;
  startedAt: Date;
  completedAt?: Date;

  /** The group's position on other groups' maps. Reported by one member only —
   *  see positionCarrierReportId — so a team shows as a single marker. */
  position?: { lat: number; lng: number };
  positionAt?: Date;
  /** First member to join this group today; the only one whose GPS is broadcast. */
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

// One run per group per activity per day. The upsert on first login relies on this.
mapGroupStateSchema.index({ activityId: 1, activityDay: 1, groupName: 1 }, { unique: true });

export const MapGroupState = model<IMapGroupState>('MapGroupState', mapGroupStateSchema, 'map_group_states');
