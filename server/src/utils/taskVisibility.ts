import { Types } from 'mongoose';
import { ManageRole } from '../models/manage/ManageUser';

/**
 * Who may see a task.
 *
 * owner and pm see everything — that is the point of the role. A member sees
 * their OWN work plus anything explicitly published to the team, and nothing
 * else: being on a project no longer drags in every teammate's task list.
 * A query filter, not a UI filter, so hitting the API directly gives the same set.
 */
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
