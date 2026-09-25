import bcrypt from 'bcryptjs';
import { Activity, User, Mission, ActivityGroup } from '../models';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../config';
import { israelDayString } from '../utils/israelTime';

export async function migrateActivities(): Promise<void> {
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
      activity.loginFields = ['name'];
    }

    if (!activity.connectionType) {
      activity.connectionType = 'single';
    }
    activity.loginComponent = undefined;
    await activity.save();
    count++;
    console.log(`  Migrated activity: ${activity.code} (was ${wasType})`);
  }

  console.log(`✅ Migrated ${count} activit${count === 1 ? 'y' : 'ies'}`);
}

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

  await ActivityGroup.syncIndexes();
}

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

  await seedUser(MANAGE_OWNER_EMAIL, MANAGE_OWNER_PASSWORD, MANAGE_OWNER_NAME, 'owner', {
    tracksTime: false,
    hourlyCost: 250,
  });

  await seedUser(MANAGE_MEMBER_EMAIL, MANAGE_MEMBER_PASSWORD, MANAGE_MEMBER_NAME, 'member', {
    color: '#00b894',
  });
}

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
  }
  await collection.updateMany({ code: { $exists: true } }, { $unset: { code: '' } }).catch(() => {});
}

export async function seedInternalProject(): Promise<void> {
  const { Project, INTERNAL_PROJECT_NAME } = await import('../models/manage/Project');
  const { ManageUser } = await import('../models/manage/ManageUser');

  if (await Project.findOne({ type: 'internal', name: INTERNAL_PROJECT_NAME })) return;
  const owner = await ManageUser.findOne({ role: 'owner' }).select('_id');
  if (!owner) return;

  await Project.create({
    name: INTERNAL_PROJECT_NAME,
    type: 'internal',
    status: 'active',
    pmUserId: owner._id,
    createdBy: owner._id,
  });
  console.log(`✅ Seeded shared internal project: ${INTERNAL_PROJECT_NAME}`);
}
