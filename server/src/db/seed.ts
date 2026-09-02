import bcrypt from 'bcryptjs';
import { Activity, User, Mission, ActivityGroup } from '../models';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../config';
import { israelDayString } from '../utils/israelTime';

/**
 * Migrates old activities that used loginComponent (academy/story)
 * to the new loginFields[] + connectionType format.
 */
export async function migrateActivities(): Promise<void> {
  // Find activities with old loginComponent field but no loginFields
  const oldActivities = await Activity.find({
    loginComponent: { $exists: true, $ne: null },
  });

  if (oldActivities.length === 0) return;

  let count = 0;
  for (const activity of oldActivities) {
    const wasType = activity.loginComponent;

    if (activity.loginComponent === 'academy') {
      activity.loginFields = ['email'];
      activity.emailGoogle = true;
    } else {
      // 'story' or any other
      activity.loginFields = ['name'];
    }

    if (!activity.connectionType) {
      activity.connectionType = 'single';
    }
    activity.loginComponent = undefined; // clear legacy field
    await activity.save();
    count++;
    console.log(`  Migrated activity: ${activity.code} (was ${wasType})`);
  }

  console.log(`✅ Migrated ${count} activit${count === 1 ? 'y' : 'ies'}`);
}

/**
 * Migrates self-service groups to day-scoped naming.
 *  1. Backfills `activityDay` (Israel calendar day) from each group's createdAt.
 *  2. Drops the legacy global-unique index {activityId, nameNormalized} so the
 *     new day-scoped unique index {activityId, activityDay, nameNormalized}
 *     (declared on the schema) can take effect and names can repeat across days.
 * Existing groups are never deleted — they stay for reporting.
 */
export async function migrateActivityGroups(): Promise<void> {
  const missing = await ActivityGroup.find({ activityDay: { $exists: false } }).select('createdAt');
  if (missing.length > 0) {
    const bulk = missing.map((g) => ({
      updateOne: {
        filter: { _id: g._id },
        update: { $set: { activityDay: israelDayString(g.createdAt ?? new Date()) } },
      },
    }));
    await ActivityGroup.bulkWrite(bulk);
    console.log(`✅ Backfilled activityDay on ${missing.length} group(s)`);
  }

  // Drop the old global-unique index if it still exists.
  try {
    const indexes = await ActivityGroup.collection.indexes();
    const legacy = indexes.find((i) => i.name === 'activityId_1_nameNormalized_1');
    if (legacy) {
      await ActivityGroup.collection.dropIndex('activityId_1_nameNormalized_1');
      console.log('✅ Dropped legacy group name index (activityId_1_nameNormalized_1)');
    }
  } catch (err) {
    console.warn('⚠️  Could not drop legacy group index:', (err as Error).message);
  }

  // Ensure the new day-scoped indexes exist even when autoIndex is off in prod.
  await ActivityGroup.syncIndexes();
}

/**
 * Seeds the built-in recycling mission if no missions exist yet.
 */
export async function seedBuiltInMission(): Promise<void> {
  const count = await Mission.countDocuments();
  if (count > 0) return;

  await Mission.create({
    name: 'פעילות מיחזור גני יהושוע',
    description: 'משימת מיחזור אינטראקטיבית בפארק גני יהושוע',
    customer: 'גני יהושוע',
    explanationScreens: [
      {
        header: 'ברוכים הבאים!',
        description: 'ברוכים הבאים למשימת המיחזור בפארק גני יהושוע!',
        buttonText: 'התחילו',
        backgroundImage: '/images/mission-bg-1.svg',
      },
      {
        header: 'על המשימה',
        description: 'במשימה זו תלמדו על חשיבות המיחזור ותעזרו לנו לשמור על הסביבה.',
        buttonText: 'המשך',
        backgroundImage: '/images/mission-bg-1.svg',
      },
      {
        header: 'איך זה עובד?',
        description: 'תעברו מסכי הסבר, תפתרו פאזל ותמיינו פסולת לפחים הנכונים.',
        buttonText: 'יוצאים למשימה!',
        backgroundImage: '/images/mission-bg-1.svg',
      },
    ],
  });
  console.log('✅ Seeded built-in recycling mission');
}

/**
 * Seeds a super_admin user from env vars if no users exist yet.
 */
export async function seedSuperAdmin(): Promise<void> {
  const count = await User.countDocuments();
  if (count > 0) return;

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await User.create({
    email: ADMIN_EMAIL.toLowerCase().trim(),
    password: hashedPassword,
    role: 'super_admin',
  });
  console.log(`✅ Seeded super_admin user: ${ADMIN_EMAIL}`);
}

/**
 * Yooz-Manage (/manage) — seeds the two real accounts on first boot.
 * Idempotent: existing users are never touched, so a redeploy can't reset a password.
 */
export async function seedManageUsers(): Promise<void> {
  const { ManageUser } = await import('../models/manage/ManageUser');
  const {
    MANAGE_OWNER_EMAIL, MANAGE_OWNER_PASSWORD, MANAGE_OWNER_NAME,
    MANAGE_MEMBER_EMAIL, MANAGE_MEMBER_PASSWORD, MANAGE_MEMBER_NAME,
  } = await import('../config');

  const seedUser = async (
    email: string,
    password: string,
    name: string,
    role: 'owner' | 'pm' | 'member',
    extra: Record<string, unknown> = {},
  ) => {
    const normalized = email.toLowerCase().trim();
    if (await ManageUser.findOne({ email: normalized })) return;
    await ManageUser.create({
      email: normalized,
      passwordHash: await bcrypt.hash(password, 10),
      name,
      role,
      ...extra,
    });
    console.log(`✅ Seeded manage ${role}: ${normalized}`);
  };

  // The owner does not report hours — see spec ch.10 decision 2.
  await seedUser(MANAGE_OWNER_EMAIL, MANAGE_OWNER_PASSWORD, MANAGE_OWNER_NAME, 'owner', {
    tracksTime: false,
    hourlyCost: 250,
  });

  await seedUser(MANAGE_MEMBER_EMAIL, MANAGE_MEMBER_PASSWORD, MANAGE_MEMBER_NAME, 'member', {
    color: '#00b894',
  });
}

/**
 * Yooz-Manage: drops the legacy unique index on mng_projects.code.
 *
 * The code field was removed from the schema. A leftover unique index would then
 * see every document as code:null and reject the SECOND project ever created
 * with a duplicate-key error — a failure that looks nothing like its cause.
 * Idempotent: a missing index is not an error.
 */
export async function dropManageProjectCodeIndex(): Promise<void> {
  const mongoose = (await import('mongoose')).default;
  const collection = mongoose.connection.db?.collection('mng_projects');
  if (!collection) return;
  try {
    const indexes = await collection.indexes();
    if (!indexes.some((i) => i.name === 'code_1')) return;
    await collection.dropIndex('code_1');
    console.log('✅ Dropped legacy mng_projects.code_1 index');
  } catch {
    /* collection may not exist yet on a fresh install — nothing to drop */
  }
  // Existing documents keep a stray `code` value; strip it so exports stay clean.
  await collection.updateMany({ code: { $exists: true } }, { $unset: { code: '' } }).catch(() => {});
}
