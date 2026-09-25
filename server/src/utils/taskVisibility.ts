import { Types } from 'mongoose';
import { ManageRole } from '../models/manage/ManageUser';

export function taskVisibility(user: { role: ManageRole; userId: string }): Record<string, unknown> {
  if (user.role === 'owner' || user.role === 'pm') return {};
  const mine = new Types.ObjectId(user.userId);
  return {
    $or: [
      { assigneeUserId: mine },
      { createdBy: mine },
      { watcherUserIds: mine },
      { visibleToAll: true },
    ],
  };
}
