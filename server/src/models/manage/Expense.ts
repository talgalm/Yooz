import { Schema, model, Types } from 'mongoose';

export type ExpenseCategory =
  | 'freelancer' | 'graphics' | 'ai_api' | 'hosting' | 'content' | 'travel' | 'other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'freelancer', 'graphics', 'ai_api', 'hosting', 'content', 'travel', 'other',
];

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
    billable: { type: Boolean, default: false },
    documentUrl: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'ManageUser', required: true },
  },
  { timestamps: true },
);

expenseSchema.index({ projectId: 1, date: -1 });
expenseSchema.index({ category: 1, date: -1 });

export const Expense = model<IExpense>('ManageExpense', expenseSchema, 'mng_expenses');
