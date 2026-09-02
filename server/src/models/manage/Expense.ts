import { Schema, model, Types } from 'mongoose';

export type ExpenseCategory =
  | 'freelancer' | 'graphics' | 'ai_api' | 'hosting' | 'content' | 'travel' | 'other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'freelancer', 'graphics', 'ai_api', 'hosting', 'content', 'travel', 'other',
];

/**
 * A project cost that is not someone's time.
 *
 * The ENTIRE entity is owner-only — there is no serializer with public fields,
 * because every field on it (what we paid, to whom) is commercially sensitive.
 * The route is gated with requireManageRole('owner'), not filtered in the output.
 */
export interface IExpense {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  date: Date;
  category: ExpenseCategory;
  vendor?: string;
  amount: number;
  description?: string;
  billable: boolean;
  documentUrl?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'ManageProject', required: true },
    date: { type: Date, required: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    vendor: { type: String, trim: true },
    amount: { type: Number, required: true },
    description: { type: String, trim: true },
    // Whether this gets passed on to the client.
    billable: { type: Boolean, default: false },
    documentUrl: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'ManageUser', required: true },
  },
  { timestamps: true },
);

expenseSchema.index({ projectId: 1, date: -1 });
expenseSchema.index({ category: 1, date: -1 });

export const Expense = model<IExpense>('ManageExpense', expenseSchema, 'mng_expenses');
