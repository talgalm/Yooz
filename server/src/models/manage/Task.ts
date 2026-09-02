import { Schema, model, Types } from 'mongoose';

export type TaskStatus = 'not_started' | 'in_progress' | 'waiting' | 'needs_approval' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export const TASK_STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'waiting', 'needs_approval', 'done'];
export const TASK_PRIORITIES: TaskPriority[] = ['low', 'normal', 'high', 'urgent'];

/** Sort weight, so "urgent" actually floats to the top of a list. */
export const PRIORITY_RANK: Record<TaskPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export interface ITaskComment {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface ITask {
  _id: Types.ObjectId;
  /**
   * Optional on purpose. A task may hang off a project, off a client, or off
   * nothing at all — "call the bank back" has to live somewhere, and forcing a
   * fake project on it is how a todo list stops being used.
   */
  projectId?: Types.ObjectId;
  clientId?: Types.ObjectId;
  stageKey?: string;

  title: string;
  description?: string;

  assigneeUserId: Types.ObjectId;
  watcherUserIds: Types.ObjectId[];

  status: TaskStatus;
  priority: TaskPriority;

  plannedHours: number;
  startDate?: Date;
  dueDate?: Date;
  completedAt?: Date;

  blockedByTaskIds: Types.ObjectId[];

  plannedWeek?: string;

  /**
   * Off by default: a task belongs to its assignee. Only owner/pm can publish
   * one to the whole team, which is what makes "my board" actually mine.
   */
  visibleToAll: boolean;

  checklist: { text: string; done: boolean }[];
  comments: ITaskComment[];

  archived: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<ITaskComment>({
  userId: { type: Schema.Types.ObjectId, ref: 'ManageUser', required: true },
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

const taskSchema = new Schema<ITask>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'ManageProject' },
    clientId: { type: Schema.Types.ObjectId, ref: 'ManageClient' },
    stageKey: { type: String },

    title: { type: String, required: true, trim: true },
    description: { type: String },

    assigneeUserId: { type: Schema.Types.ObjectId, ref: 'ManageUser', required: true },
    watcherUserIds: { type: [Schema.Types.ObjectId], ref: 'ManageUser', default: [] },

    status: { type: String, enum: TASK_STATUSES, default: 'not_started' },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'normal' },

    plannedHours: { type: Number, default: 0 },
    startDate: { type: Date },
    dueDate: { type: Date },
    completedAt: { type: Date },

    blockedByTaskIds: { type: [Schema.Types.ObjectId], ref: 'ManageTask', default: [] },

    plannedWeek: { type: String },

    visibleToAll: { type: Boolean, default: false },

    checklist: { type: [{ text: String, done: Boolean }], default: [] },
    comments: { type: [commentSchema], default: [] },

    archived: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'ManageUser', required: true },
  },
  { timestamps: true },
);

taskSchema.index({ assigneeUserId: 1, status: 1, dueDate: 1 });
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ clientId: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ plannedWeek: 1 });

export const Task = model<ITask>('ManageTask', taskSchema, 'mng_tasks');

/** Open means "still needs doing" — used by every overdue and load calculation. */
export function isOpen(status: TaskStatus): boolean {
  return status !== 'done';
}
