import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Activity } from '../models/Activity';
import { Game } from '../models/Game';
import { Station } from '../models/Station';
import { Report } from '../models/Report';
import { Portal } from '../models/Portal';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const CUSTOMER_EMAIL = 'tal.galmor3@gmail.com';

const hebrewNames = [
  'יוסי כהן', 'דנה לוי', 'אורי שמעוני', 'נועה ברק', 'איתי מזרחי',
  'שירה גולן', 'עומר אביב', 'מיכל רוזן', 'אלון פרידמן', 'תמר שפירא',
  'רון דוד', 'ליאור חיים', 'גל ישראלי', 'עדי קפלן', 'יעל בן דוד',
  'אריאל נחום', 'הילה ענבר', 'עידן סגל', 'רותם אשכנזי', 'מעיין צור',
  'דור ביטון', 'שקד עמר', 'נועם ריבלין', 'אלה גרינברג', 'עמית הרשקוביץ',
];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysBack: number) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(randomBetween(8, 22), randomBetween(0, 59), randomBetween(0, 59));
  return d;
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Connected to MongoDB');

  const triviaGame = await Game.create({
    name: 'חידון ידע כללי',
    type: 'trivia',
    description: 'חידון עם 5 שאלות על ידע כללי',
    customer: 'Yooz Demo',
    theme: 'כללי',
    createdByEmail: CUSTOMER_EMAIL,
    settings: {
      questions: [
        { text: 'מהי בירת צרפת?', answers: ['לונדון', 'פריז', 'ברלין', 'מדריד'], correctAnswer: 1, points: 20 },
        { text: 'כמה שחקנים בקבוצת כדורגל?', answers: ['9', '10', '11', '12'], correctAnswer: 2, points: 20 },
        { text: 'מי כתב את הארי פוטר?', answers: ['ג.ק. רולינג', 'סטיבן קינג', 'ג.ר.ר. טולקין', 'רואלד דאל'], correctAnswer: 0, points: 20 },
        { text: 'מהו היסוד הכימי של מים?', answers: ['CO2', 'H2O', 'O2', 'NaCl'], correctAnswer: 1, points: 20 },
        { text: 'באיזו שנה הוקמה מדינת ישראל?', answers: ['1945', '1948', '1950', '1952'], correctAnswer: 1, points: 20 },
      ],
      timeLimit: 30,
    },
  });
  console.log('Created trivia game:', triviaGame.name);

  const orderGame = await Game.create({
    name: 'סדר כרונולוגי - היסטוריה',
    type: 'order',
    description: 'סדרו את האירועים ההיסטוריים בסדר הנכון',
    customer: 'Yooz Demo',
    theme: 'היסטוריה',
    createdByEmail: CUSTOMER_EMAIL,
    settings: {
      items: [
        { text: 'המצאת הדפוס', order: 1 },
        { text: 'גילוי אמריקה', order: 2 },
        { text: 'המהפכה הצרפתית', order: 3 },
        { text: 'מלחמת העולם הראשונה', order: 4 },
        { text: 'נחיתה על הירח', order: 5 },
      ],
      points: 100,
    },
  });
  console.log('Created order game:', orderGame.name);

  const trueFalseGame = await Game.create({
    name: 'נכון או לא - מדע',
    type: 'trueFalse',
    description: 'בדקו את הידע שלכם במדע',
    customer: 'Yooz Demo',
    theme: 'מדע',
    createdByEmail: CUSTOMER_EMAIL,
    settings: {
      questions: [
        { text: 'השמש היא כוכב', answer: true, points: 20 },
        { text: 'האדם יכול לנשום מתחת למים', answer: false, points: 20 },
        { text: 'היהלום הוא החומר הקשה ביותר בטבע', answer: true, points: 20 },
        { text: 'הירח מאיר מעצמו', answer: false, points: 20 },
        { text: 'המים רותחים ב-100 מעלות צלזיוס', answer: true, points: 20 },
      ],
    },
  });
  console.log('Created trueFalse game:', trueFalseGame.name);

  const ballGame = await Game.create({
    name: 'משחק כדורים - צבעים',
    type: 'ballGame',
    description: 'התאימו כדורים לצבעים הנכונים',
    customer: 'Yooz Demo',
    theme: 'צבעים',
    createdByEmail: CUSTOMER_EMAIL,
    settings: { wallHeight: 200, maxScore: 100 },
  });
  console.log('Created ball game:', ballGame.name);

  const welcomeStation = await Station.create({
    name: 'ברוכים הבאים',
    type: 'text',
    description: 'תחנת פתיחה עם הנחיות',
    customer: 'Yooz Demo',
    createdByEmail: CUSTOMER_EMAIL,
    settings: {
      title: 'ברוכים הבאים להרפתקה!',
      content: 'במסלול הזה תעברו דרך משחקים ותחנות מגוונות. בהצלחה!',
      buttonText: 'קדימה!',
    },
  });

  const videoStation = await Station.create({
    name: 'סרטון הדרכה',
    type: 'video',
    description: 'סרטון הסבר קצר',
    customer: 'Yooz Demo',
    createdByEmail: CUSTOMER_EMAIL,
    settings: {
      title: 'צפו בסרטון לפני שממשיכים',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      buttonText: 'המשך',
    },
  });

  const badgeStation = await Station.create({
    name: 'תג הישגים',
    type: 'badge',
    description: 'תחנת סיום עם תג',
    customer: 'Yooz Demo',
    createdByEmail: CUSTOMER_EMAIL,
    settings: {
      title: 'כל הכבוד! סיימתם את המסלול!',
      badgeText: 'מומחה ידע',
    },
  });
  console.log('Created 3 stations');

  const games = [triviaGame, orderGame, trueFalseGame, ballGame];
  const stations = [welcomeStation, videoStation, badgeStation];

  const moduleItems = [
    { type: 'station' as const, ref: welcomeStation._id },
    { type: 'game' as const, ref: triviaGame._id },
    { type: 'game' as const, ref: orderGame._id },
    { type: 'station' as const, ref: videoStation._id },
    { type: 'game' as const, ref: trueFalseGame._id },
    { type: 'game' as const, ref: ballGame._id },
    { type: 'station' as const, ref: badgeStation._id },
  ];

  const activity = await Activity.create({
    name: 'הרפתקת הידע הגדולה',
    status: 'live',
    loginFields: ['name', 'email'],
    emailGoogle: true,
    connectionType: 'group',
    groups: [{ name: 'קבוצה א' }, { name: 'קבוצה ב' }, { name: 'קבוצה ג' }],
    module: {
      type: 'story',
      theme: '',
      items: moduleItems,
      popups: [
        { title: 'מזל טוב!', contentType: 'text', text: 'סיימת את החצי הראשון!', trigger: { point: 'afterItem', itemIndex: 3 }, enabled: true },
      ],
    },
    guidelines: 'עקבו אחרי המסלול, ענו על השאלות וצברו נקודות!',
    createdByEmail: CUSTOMER_EMAIL,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  });
  console.log('Created activity:', activity.name, '| code:', activity.code);

  const activity2 = await Activity.create({
    name: 'אתגר המדע',
    status: 'live',
    loginFields: ['name'],
    connectionType: 'single',
    module: {
      type: 'story',
      theme: 'ocean',
      items: [
        { type: 'station' as const, ref: welcomeStation._id },
        { type: 'game' as const, ref: trueFalseGame._id },
        { type: 'game' as const, ref: triviaGame._id },
        { type: 'station' as const, ref: badgeStation._id },
      ],
    },
    createdByEmail: CUSTOMER_EMAIL,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  });
  console.log('Created activity:', activity2.name, '| code:', activity2.code);

  const activity3 = await Activity.create({
    name: 'טריוויה חגיגית',
    status: 'preview',
    loginFields: ['name', 'phoneNumber'],
    connectionType: 'single',
    module: {
      type: 'story',
      items: [
        { type: 'game' as const, ref: triviaGame._id },
        { type: 'game' as const, ref: orderGame._id },
      ],
    },
    createdByEmail: CUSTOMER_EMAIL,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  });
  console.log('Created activity:', activity3.name, '| code:', activity3.code, '(preview)');

  const groupNames = ['קבוצה א', 'קבוצה ב', 'קבוצה ג'];
  const reports: InstanceType<typeof Report>[] = [];

  for (let i = 0; i < 25; i++) {
    const name = hebrewNames[i];
    const group = groupNames[i % 3];
    const joinedAt = randomDate(14);
    const completed = Math.random() > 0.15;
    const inProgress = !completed && Math.random() > 0.5;
    const completionStatus = completed ? 'completed' : inProgress ? 'in_progress' : 'joined';
    const itemsCompleted = completed ? 7 : inProgress ? randomBetween(1, 5) : 0;

    const gameScores = [
      { gameName: triviaGame.name, score: randomBetween(20, 100) },
      { gameName: orderGame.name, score: randomBetween(0, 100) },
      { gameName: trueFalseGame.name, score: randomBetween(20, 100) },
      { gameName: ballGame.name, score: randomBetween(10, 100) },
    ];

    const totalScore = completed
      ? gameScores.reduce((s, g) => s + g.score, 0)
      : gameScores.slice(0, Math.min(itemsCompleted, 4)).reduce((s, g) => s + g.score, 0);

    const sessionStart = new Date(joinedAt.getTime() + 10000);
    const sessionDuration = randomBetween(180000, 900000);

    const itemResults = [];
    const allItems = [
      { id: welcomeStation._id.toString(), type: 'station' as const, name: welcomeStation.name },
      { id: triviaGame._id.toString(), type: 'game' as const, name: triviaGame.name, gameType: 'trivia' },
      { id: orderGame._id.toString(), type: 'game' as const, name: orderGame.name, gameType: 'order' },
      { id: videoStation._id.toString(), type: 'station' as const, name: videoStation.name },
      { id: trueFalseGame._id.toString(), type: 'game' as const, name: trueFalseGame.name, gameType: 'trueFalse' },
      { id: ballGame._id.toString(), type: 'game' as const, name: ballGame.name, gameType: 'ballGame' },
      { id: badgeStation._id.toString(), type: 'station' as const, name: badgeStation.name },
    ];

    for (let j = 0; j < Math.min(itemsCompleted, allItems.length); j++) {
      const item = allItems[j];
      const startedAt = new Date(sessionStart.getTime() + j * randomBetween(20000, 120000));
      const dur = randomBetween(15000, 180000);
      const score = item.type === 'game' ? gameScores.find(g => g.gameName === item.name)?.score || 0 : 0;
      const hintUsed = item.type === 'game' && Math.random() > 0.7;

      const result: Record<string, unknown> = {
        itemIndex: j,
        itemId: item.id,
        itemType: item.type,
        itemName: item.name,
        score,
        maxPossibleScore: item.type === 'game' ? 100 : 0,
        startedAt,
        completedAt: new Date(startedAt.getTime() + dur),
        durationMs: dur,
        hintUsed,
        hintPenalty: hintUsed ? 5 : 0,
      };
      if (item.type === 'game' && item.gameType) {
        result.gameType = item.gameType;
      }
      if (item.gameType === 'trivia' || item.gameType === 'trueFalse') {
        result.questionAnswers = Array.from({ length: 5 }, (_, qi) => {
          const isCorrect = Math.random() > 0.35;
          return {
            questionIndex: qi,
            questionText: `שאלה ${qi + 1}`,
            selectedAnswers: [isCorrect ? 1 : 0],
            correctAnswers: [1],
            isCorrect,
            pointsEarned: isCorrect ? 20 : 0,
            timeSpentMs: randomBetween(3000, 25000),
          };
        });
      }
      itemResults.push(result);
    }

    const report = await Report.create({
      activityId: activity._id,
      activityCode: activity.code,
      participantName: name,
      email: `user${i + 1}@example.com`,
      connectionType: 'group',
      group,
      joinedAt,
      completionStatus,
      sessionStartedAt: sessionStart,
      sessionCompletedAt: completed ? new Date(sessionStart.getTime() + sessionDuration) : undefined,
      sessionDurationMs: completed ? sessionDuration : undefined,
      totalItemsCompleted: itemsCompleted,
      totalItemsInModule: 7,
      lastActiveItemIndex: Math.max(0, itemsCompleted - 1),
      data: {
        scores: gameScores.slice(0, Math.min(itemsCompleted, 4)),
        totalScore,
        itemResults,
      },
    });
    reports.push(report);
  }
  console.log(`Created ${reports.length} reports for activity 1`);

  for (let i = 0; i < 12; i++) {
    const name = hebrewNames[i + 5];
    const joinedAt = randomDate(7);
    const completed = Math.random() > 0.2;
    const totalScore = completed ? randomBetween(40, 200) : randomBetween(0, 80);

    await Report.create({
      activityId: activity2._id,
      activityCode: activity2.code,
      participantName: name,
      connectionType: 'single',
      joinedAt,
      completionStatus: completed ? 'completed' : 'in_progress',
      sessionStartedAt: joinedAt,
      sessionCompletedAt: completed ? new Date(joinedAt.getTime() + randomBetween(120000, 600000)) : undefined,
      sessionDurationMs: completed ? randomBetween(120000, 600000) : undefined,
      totalItemsCompleted: completed ? 4 : randomBetween(1, 3),
      totalItemsInModule: 4,
      lastActiveItemIndex: completed ? 3 : randomBetween(0, 2),
      data: {
        scores: [
          { gameName: trueFalseGame.name, score: randomBetween(20, 100) },
          { gameName: triviaGame.name, score: randomBetween(20, 100) },
        ],
        totalScore,
      },
    });
  }
  console.log('Created 12 reports for activity 2');

  const portal = await Portal.create({
    name: 'פורטל צוות פיתוח',
    description: 'פורטל לצוות הפיתוח של Yooz',
    users: [
      { username: 'tal.galmor', password: '123456', status: 'approved' },
      { username: 'dana.levi', password: '123456', status: 'approved' },
      { username: 'ori.shimoni', password: '123456', status: 'approved' },
      { username: 'noa.barak', password: '123456', status: 'approved' },
      { username: 'itay.mizrachi', password: '123456', status: 'pending' },
      { username: 'shira.golan', password: '123456', status: 'denied' },
    ],
    activities: [activity._id, activity2._id],
    createdByEmail: CUSTOMER_EMAIL,
  });

  await Activity.updateMany(
    { _id: { $in: [activity._id, activity2._id] } },
    { $set: { portalId: portal._id, isContinuous: true } }
  );

  console.log('Created portal:', portal.name, '| code:', portal.code);

  console.log('\n═══════════════════════════════════════');
  console.log('✅ Seed complete!');
  console.log(`   Customer: ${CUSTOMER_EMAIL}`);
  console.log(`   Games: ${games.length}`);
  console.log(`   Stations: ${stations.length}`);
  console.log(`   Activities: 3`);
  console.log(`     - "${activity.name}" (code: ${activity.code}) — live, 25 participants, 3 groups`);
  console.log(`     - "${activity2.name}" (code: ${activity2.code}) — live, 12 participants`);
  console.log(`     - "${activity3.name}" (code: ${activity3.code}) — preview`);
  console.log(`   Portal: "${portal.name}" (code: ${portal.code}) — 6 users`);
  console.log(`     Portal users: tal.galmor / dana.levi / ori.shimoni / noa.barak (pass: 123456)`);
  console.log('═══════════════════════════════════════');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
