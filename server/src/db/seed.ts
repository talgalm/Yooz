import bcrypt from 'bcryptjs';
import { Activity, User } from '../models';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../config';

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
