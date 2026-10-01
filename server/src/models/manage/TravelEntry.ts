import { Schema, model, Types } from 'mongoose';

export interface ITravelEntry {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: Date;
  amount: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const travelEntrySchema = new Schema<ITravelEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'ManageUser', required: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true },
  },
  { timestamps: true },
);

travelEntrySchema.index({ userId: 1, date: -1 });

export const TravelEntry = model<ITravelEntry>('ManageTravelEntry', travelEntrySchema, 'mng_travel_entries');
