import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { JWT_SECRET } from '../config';
import { LoginResponse, ConnectionType } from '../types';
import { IActivity } from '../models/Activity';
import { ActivityGroup, normalizeGroupName } from '../models/ActivityGroup';
import { Report } from '../models/Report';
import { bumpParticipantCount } from './participantCountCache';
import { israelDayString, startOfTodayIsrael } from './israelTime';

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
    // Self-service groups are day-scoped: only a group created today can be joined.
    // Previous days' groups stay in the DB (for reports) but are no longer joinable.
    const today = israelDayString();
    if (opts.groupToken) {
      const found = await ActivityGroup.findOne({
        activityId: activity._id!,
        inviteToken: opts.groupToken.trim(),
      });
      if (!found) return { error: 'Invalid group invite link', status: 404 };
      if (found.activityDay !== today) return { error: 'This group invite link has expired', status: 410 };
      return { groupName: found.name };
    }
    if (opts.group) {
      const normalized = normalizeGroupName(opts.group);
      const found = await ActivityGroup.findOne({
        activityId: activity._id!,
        activityDay: today,
        nameNormalized: normalized,
      });
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

export async function checkGroupCapacity(
  activity: IActivity,
  groupName: string,
  identity: { email?: string; phoneNumber?: string; displayName: string },
): Promise<string | null> {
  if (activity.connectionType !== 'group' || activity.groupEntryMode !== 'selfService') return null;

  // A redeemed ticket code raises the cap for one group only (maxMembersOverride);
  // otherwise the activity-wide cap applies.
  const group = await ActivityGroup.findOne({
    activityId: activity._id!,
    activityDay: israelDayString(),
    name: groupName,
  }).lean();
  const max = group?.maxMembersOverride ?? activity.groupMaxMembers;
  if (!max || max <= 0) return null;

  const lookup = buildReportLookupQuery(
    activity.code,
    identity.displayName,
    groupName,
    identity.email,
    identity.phoneNumber,
    true,
  );
  const alreadyMember = await Report.exists(lookup);
  if (alreadyMember) return null;

  // ponytail: read-then-write race could let two concurrent joins both squeak past
  // the cap. Family-group sizes are small / low-concurrency so acceptable; upgrade
  // to a unique-index or transactional join slot if it ever bites.
  // Day-scoped: only today's members count toward the cap (group names can repeat
  // across days, so a previous day's members must not fill up today's group).
  const memberCount = await Report.countDocuments({
    activityId: activity._id,
    group: groupName,
    joinedAt: { $gte: startOfTodayIsrael() },
  });
  if (memberCount >= max) return 'group_full';
  return null;
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

  let report = existingReport;
  if (!report) {
    report = await Report.create({
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
      // Pin the session to the report login just resolved. Everything after
      // this (resume, progress saves, final scores) addresses it by id — name
      // is not an identity: two people share one, and one person with two
      // email addresses has two reports under the same name, so a name lookup
      // resumes and overwrites whichever report happens to be newest.
      reportId: String(report._id),
      connectionType,
      ...(opts.email && { email: opts.email }),
      ...(opts.phoneNumber && { phoneNumber: opts.phoneNumber }),
      ...(opts.group && { group: opts.group }),
    },
    JWT_SECRET,
    // ponytail: 7d so a queued score still flushes after a long offline gap.
    // Participants are anonymous; no security downside.
    { expiresIn: '7d' },
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

/**
 * The report a participant session owns. Tokens issued before `reportId`
 * existed fall back to the old name lookup (`sort({joinedAt:-1})` still applies
 * at the call site); they expire within 7 days of deploy.
 */
export function ownReportFilter(participant: {
  reportId?: string;
  activityCode: string;
  participantName: string;
}): Record<string, unknown> {
  if (participant.reportId && Types.ObjectId.isValid(participant.reportId)) {
    return { _id: new Types.ObjectId(participant.reportId) };
  }
  return { activityCode: participant.activityCode, participantName: participant.participantName };
}
