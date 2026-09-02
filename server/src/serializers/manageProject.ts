import { IProject } from '../models/manage/Project';
import { ManageRole } from '../models/manage/ManageUser';

/**
 * The ONLY shape a project leaves the server in.
 *
 * Never `res.json(project)` directly — money fields live on this document from
 * M3 onward even though the money SCREENS arrive in M5, so the gate has to
 * exist the moment the fields do. Hiding them in the UI is convenience,
 * not security: a member who opens the network tab must not see agreedPrice.
 *
 * `recurring.enabled` is deliberately public — it is the one-off vs retainer
 * flag the project list filters on, and it carries no amount.
 */
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
