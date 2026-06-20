import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { LoginResponse, ConnectionType } from '../types';
import { IActivity } from '../models/Activity';
import { ActivityGroup, normalizeGroupName } from '../models/ActivityGroup';
import { Report } from '../models/Report';
import { bumpParticipantCount } from './participantCountCache';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function validateGroupName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return 'Group name must be between 2 and 50 characters';
  }
  return null;
}

export async function resolveGroupName(
  activity: IActivity,
  opts: { group?: string; groupToken?: string },
): Promise<{ groupName: string } | { error: string; status: number }> {
  const entryMode = activity.groupEntryMode || 'preset';

  if (entryMode === 'selfService') {
    if (opts.groupToken) {
      const found = await ActivityGroup.findOne({
        activityId: activity._id!,
        inviteToken: opts.groupToken.trim(),
      });
      if (!found) return { error: 'Invalid group invite link', status: 404 };
      return { groupName: found.name };
    }
    if (opts.group) {
      const normalized = normalizeGroupName(opts.group);
      const found = await ActivityGroup.findOne({ activityId: activity._id!, nameNormalized: normalized });
      if (!found) return { error: 'Group not found', status: 404 };
      return { groupName: found.name };
    }
    return { error: 'Group selection is required for this activity', status: 400 };
  }

  if (!opts.group) {
    return { error: 'Group selection is required for this activity', status: 400 };
  }
  const validGroups = (activity.groups || []).map((g) => g.name);
  if (!validGroups.includes(opts.group)) {
    return { error: 'Invalid group selection', status: 400 };
  }
  return { groupName: opts.group };
}

export function buildReportLookupQuery(
  activityCode: string,
  displayName: string,
  group: string | undefined,
  email: string | undefined,
  phoneNumber: string | undefined,
  selfServiceGroup: boolean,
): Record<string, unknown> {
  const lookupQuery: Record<string, unknown> = { activityCode };

  if (selfServiceGroup && group) {
    lookupQuery.group = group;
    if (email) {
      lookupQuery.email = { $regex: `^${escapeRegex(email)}$`, $options: 'i' };
    } else {
      lookupQuery.participantName = displayName;
    }
    return lookupQuery;
  }

  if (email) {
    lookupQuery.email = { $regex: `^${escapeRegex(email)}$`, $options: 'i' };
  } else if (phoneNumber) {
    lookupQuery.phoneNumber = phoneNumber.trim();
  } else {
    lookupQuery.participantName = displayName;
  }
  return lookupQuery;
}

export async function createParticipantSession(
  activity: IActivity,
  opts: {
    activityCode: string;
    displayName: string;
    email?: string;
    phoneNumber?: string;
    group?: string;
  },
): Promise<LoginResponse> {
  const connectionType = (activity.connectionType || 'single') as ConnectionType;
  const selfServiceGroup = connectionType === 'group' && (activity.groupEntryMode || 'preset') === 'selfService';

  const lookupQuery = buildReportLookupQuery(
    opts.activityCode,
    opts.displayName,
    opts.group,
    opts.email,
    opts.phoneNumber,
    selfServiceGroup,
  );

  const existingReport = await Report.findOne(lookupQuery).sort({ joinedAt: -1 });
  const resolvedName = existingReport?.participantName || opts.displayName;

  if (!existingReport) {
    await Report.create({
      activityId: activity._id!,
      activityCode: opts.activityCode,
      participantName: resolvedName,
      email: opts.email,
      phoneNumber: opts.phoneNumber,
      connectionType,
      group: opts.group,
    });
    bumpParticipantCount(activity._id!);
  }

  const token = jwt.sign(
    {
      participantName: resolvedName,
      activityCode: opts.activityCode,
      connectionType,
      ...(opts.email && { email: opts.email }),
      ...(opts.phoneNumber && { phoneNumber: opts.phoneNumber }),
      ...(opts.group && { group: opts.group }),
    },
    JWT_SECRET,
    { expiresIn: '24h' },
  );

  return {
    token,
    participant: {
      name: resolvedName,
      activityCode: opts.activityCode,
      connectionType,
      ...(opts.email && { email: opts.email }),
      ...(opts.phoneNumber && { phoneNumber: opts.phoneNumber }),
      ...(opts.group && { group: opts.group }),
    },
  };
}
