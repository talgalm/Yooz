import { IProject } from '../models/manage/Project';
import { ManageRole } from '../models/manage/ManageUser';

export function serializeProject(doc: IProject, role: ManageRole) {
  const base = {
    _id: doc._id,
    name: doc.name,
    type: doc.type,
    clientId: doc.clientId,
    primaryContactId: doc.primaryContactId,
    description: doc.description,

    status: doc.status,
    stages: doc.stages,
    currentStageKey: doc.currentStageKey,

    pmUserId: doc.pmUserId,
    memberUserIds: doc.memberUserIds,

    startDate: doc.startDate,
    targetDate: doc.targetDate,
    goLiveDate: doc.goLiveDate,
    closedAt: doc.closedAt,

    plannedHours: doc.plannedHours,
    recurring: { enabled: doc.recurring?.enabled ?? false },

    health: doc.health,
    healthReason: doc.healthReason,
    driveUrl: doc.driveUrl,
    tags: doc.tags,
    archived: doc.archived,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  if (role !== 'owner') return base;

  return {
    ...base,
    agreedPrice: doc.agreedPrice,
    currency: doc.currency,
    contract: doc.contract,
    recurring: doc.recurring,
    paymentMilestones: doc.paymentMilestones,
  };
}

export type SerializedProject = ReturnType<typeof serializeProject>;
