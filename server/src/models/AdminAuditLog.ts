import { Schema, model } from 'mongoose';

export interface IAdminAuditLog {
  adminEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  details?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const adminAuditLogSchema = new Schema<IAdminAuditLog>({
  adminEmail: { type: String, required: true },
  action: { type: String, required: true },
  targetType: { type: String },
  targetId: { type: String },
  targetName: { type: String },
  details: { type: Schema.Types.Mixed },
  ip: { type: String },
  createdAt: { type: Date, default: Date.now },
});

adminAuditLogSchema.index({ adminEmail: 1 });
adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ action: 1 });

export const AdminAuditLog = model<IAdminAuditLog>(
  'AdminAuditLog',
  adminAuditLogSchema,
  'admin_audit_logs',
);
