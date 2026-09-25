import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Portal } from '../models/Portal';
import { Activity } from '../models/Activity';
import { Report } from '../models/Report';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysBack: number) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(randomBetween(8, 22), randomBetween(0, 59));
  return d;
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Connected to MongoDB');

  const portal = await Portal.findOne({ createdByEmail: 'tal.galmor3@gmail.com' });
  if (!portal) { console.log('No portal found'); process.exit(1); }

  console.log('Portal:', portal.name, '| code:', portal.code);
  console.log('Users:', portal.users.map(u => `${u.username} (${u.status})`).join(', '));

  const activities = await Activity.find({ _id: { $in: portal.activities } }).lean();
  console.log('Activities:', activities.map(a => `${a.name} (${a.code})`).join(', '));

  if (activities.length === 0) {
    console.log('No activities linked to portal');
    process.exit(1);
  }

  const { Game } = await import('../models');

  const approvedUsers = portal.users.filter(u => u.status === 'approved');
  console.log(`\nGenerating history for ${approvedUsers.length} approved users across ${activities.length} activities...`);

  let totalReports = 0;

  for (const user of approvedUsers) {
    for (const activity of activities) {
      const playCount = randomBetween(1, 3);

      const gameIds = (activity.module?.items || []).filter(i => i.type === 'game').map(i => i.ref.toString());
      const games = gameIds.length > 0 ? await Game.find({ _id: { $in: gameIds } }).lean() : [];

      for (let p = 0; p < playCount; p++) {
        const joinedAt = randomDate(21);
        const completed = Math.random() > 0.1;
        const totalItems = activity.module?.items?.length || 4;
        const itemsCompleted = completed ? totalItems : randomBetween(1, totalItems - 1);
        const sessionDurationMs = randomBetween(120000, 900000);
        const sessionStart = new Date(joinedAt.getTime() + 5000);

        const scores = games.map(g => ({
          gameName: g.name,
          score: randomBetween(15, 100),
        }));
        const totalScore = scores.reduce((s, g) => s + g.score, 0);

        const itemResults = [];
        const moduleItems = activity.module?.items || [];
        for (let j = 0; j < Math.min(itemsCompleted, moduleItems.length); j++) {
          const mi = moduleItems[j];
          const isGame = mi.type === 'game';
          const refId = mi.ref.toString();
          const game = games.find(g => g._id.toString() === refId);
          const startedAt = new Date(sessionStart.getTime() + j * randomBetween(15000, 90000));
          const dur = randomBetween(10000, 180000);
          const score = isGame ? (scores.find(s => s.gameName === game?.name)?.score || randomBetween(10, 100)) : 0;
          const hintUsed = isGame && Math.random() > 0.75;

          itemResults.push({
            itemIndex: j,
            itemId: refId,
            itemType: mi.type,
            itemName: game?.name || 'תחנה',
            ...(isGame && game ? { gameType: game.type } : {}),
            score,
            maxPossibleScore: isGame ? 100 : 0,
            startedAt,
            completedAt: new Date(startedAt.getTime() + dur),
            durationMs: dur,
            hintUsed,
            hintPenalty: hintUsed ? 5 : 0,
          });
        }

        const group = activity.connectionType === 'group' && activity.groups.length > 0
          ? activity.groups[randomBetween(0, activity.groups.length - 1)].name
          : undefined;

        await Report.create({
          activityId: activity._id,
          activityCode: activity.code,
          participantName: user.username,
          connectionType: activity.connectionType,
          ...(group && { group }),
          joinedAt,
          completionStatus: completed ? 'completed' : 'in_progress',
          sessionStartedAt: sessionStart,
          sessionCompletedAt: completed ? new Date(sessionStart.getTime() + sessionDurationMs) : undefined,
          sessionDurationMs: completed ? sessionDurationMs : undefined,
          totalItemsCompleted: itemsCompleted,
          totalItemsInModule: totalItems,
          lastActiveItemIndex: Math.max(0, itemsCompleted - 1),
          data: {
            scores,
            totalScore,
            itemResults,
          },
        });
        totalReports++;
      }
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`✅ Created ${totalReports} report entries for portal users`);
  console.log(`   Portal: ${portal.name} (code: ${portal.code})`);
  console.log(`   Login as any approved user with password: 123456`);
  console.log(`   Approved users: ${approvedUsers.map(u => u.username).join(', ')}`);
  console.log(`   Portal URL: /portal/${portal.code}`);
  console.log(`═══════════════════════════════════════`);

  await mongoose.disconnect();
}

seed().catch(err => { console.error('Failed:', err); process.exit(1); });
