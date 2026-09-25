import { IActivity } from '../models/Activity';
import { Report } from '../models/Report';
import { startOfTodayIsrael } from './israelTime';

export interface GroupStatus {
  memberCount: number;
  minMembers: number;
  canProceed: boolean;
  completedCount: number;
  allMembersCompleted: boolean;
}

export function resolveGroupMinMembers(activity: IActivity): number {
  if (activity.groupEntryMode !== 'selfService') return 1;
  const min = activity.groupMinMembers ?? 1;
  return Math.max(1, min);
}

export async function getGroupStatus(activity: IActivity, groupName: string): Promise<GroupStatus | null> {
  if (!groupName || activity.connectionType !== 'group') return null;

  const reports = await Report.find(
    { activityId: activity._id, group: groupName, joinedAt: { $gte: startOfTodayIsrael() } },
    { completionStatus: 1 },
  ).lean();

  const memberCount = reports.length;
  const minMembers = resolveGroupMinMembers(activity);
  const completedCount = reports.filter((r) => r.completionStatus === 'completed').length;

  return {
    memberCount,
    minMembers,
    canProceed: memberCount >= minMembers,
    completedCount,
    allMembersCompleted: memberCount > 0 && completedCount === memberCount,
  };
}
