/**
 * Migration script: Import old Firestore customer data into the Yooz Content Library
 *
 * All imported data goes into the `library_items` collection (separate from real games/stations).
 * From the Content Library tab, items can be previewed and copied to real games/stations.
 *
 * Maps:
 * - gamesConfigurationSets → LibraryItem (kind: 'game', type: 'trivia')
 * - componentsConfigurationSets → LibraryItem (kind: 'station', type: 'video'|'image'|'text')
 *
 * Tags added: customer name, language, "imported", and category-specific tags.
 * Skips unsupported game types (memory, escape answer verify, etc.) — logs them for review.
 *
 * Usage:
 *   npx ts-node src/scripts/migrate-customers.ts [--dry-run]
 */

import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { MONGODB_URI } from '../config';
import { LibraryItem } from '../models/LibraryItem';

// ─── Old Firestore Types ───

interface OldCustomer {
  _id: string;
  name: string;
  language?: string;
  _subcollections?: {
    componentsConfigurationSets?: OldComponentConfig[];
    gamesConfigurationSets?: OldGameConfig[];
  };
}

interface OldComponentConfig {
  _id: string;
  componentId: string;
  name: string;
  configurations: Record<string, unknown>;
}

interface OldGameConfig {
  _id: string;
  gameId: string;
  name: string;
  configurations: unknown[] | Record<string, unknown>;
}

// ─── Component ID → Station type mapping ───

const COMPONENT_TO_STATION: Record<string, { type: 'text' | 'video' | 'image'; category: string }> = {
  // Video stations (link/vimeo)
  'U3yrqsw4kEGlJgkPeZxo': { type: 'video', category: 'video' },
  // Image stations (url-based)
  '5KoJq3O7vAW7bRxwvrY7': { type: 'image', category: 'image-challenge' },
  '5qXp60HM1svkMPK0RW8i': { type: 'image', category: 'image' },
  '2abQGeFZDptEImTWMTgr': { type: 'image', category: 'image' },
  // Q&A / text stations
  'oauHQ7TJitlMDOL6v2bx': { type: 'text', category: 'qa-station' },
  'AqwsCjAR7AqPCEJOjGaU': { type: 'text', category: 'riddle' },
  'ruvelQ6mbSE1Nm1W0dkc': { type: 'text', category: 'survey' },
  'R2domxD9vI9h66tLFVEP': { type: 'text', category: 'qa-station' },
  'p99oUvjIfoQRFHYYEgeU': { type: 'text', category: 'riddle' },
  'fUAI7x8K3mN9QvR2WzY5': { type: 'text', category: 'ai-prompt' },
};

// Component IDs to skip (game launchers, escape verify, complex escape frames)
const SKIP_COMPONENTS = new Set([
  'Uv34KePwYvCxVC9gToWu',   // Game launcher (bridge to game, not a station)
  'AsjHpeJqyGJpZYzMqcpz',   // Escape room answer verification
  'MQjFnoMsSMMJZ9YFlTzD',   // Multi-frame escape challenge
]);

// ─── Game ID → mapping info ───

// Games with trivia-style question arrays
const TRIVIA_GAME_IDS = new Set([
  'I7wBOeWZqdDXUkpIN3g2',   // Puzzle trivia (question, realAnswer, fakeAnswer1, fakeAnswer2)
  'unItB2jC2iH3ShsFJirl',   // Trivia with images (question, realAnswer, fakeAnswer1-3, img)
  'Yd0mqvfhejqye8k1H0oy',  // Multi-answer trivia (question, trueAnswers, wrongAnswers)
  'u7HhTRF7IjznvxRQ6JXw',  // Ball game trivia (question, answer, fakeAnswer1-3)
]);

// Game IDs to skip (no question data / unsupported types)
const SKIP_GAME_IDS = new Set([
  'mhPqktjWFCLNEfqFhOhO',  // True/False — no questions in configs
  'L3txSVIbfBX93EoqEj7C',   // Memory game — no question data
  'abC8EiFAcCimZYc9KYRr',   // Station-type game
  'tw1RGhpI9Kp7MQqEdsGh',  // Decision simulator
  'NhInVTDrjAeUJQNbEg8M',  // Matchsticks
  'jyeKPwy8f2CUmq1emCM9',  // Pairs
  'MKJ32JRmurrkIxXAuhvB',  // Numbers
  'NNdr1NRKTfWQlFwKfM5d',  // Factory
  'kugSqiCRCMlC0bXidF26',  // Unknown
  'cqJQ0eq9pKX3T7get995',  // Unknown
  '9IGdQJ6usjztYUgiVBc7',  // Unknown
]);

// ─── Question normalization ───

interface NormalizedQuestion {
  text: string;
  hint?: string;
  media?: string;
  answers: { text: string; isCorrect: boolean }[];
}

function normalizeQuestion(raw: Record<string, unknown>, gameId: string): NormalizedQuestion | null {
  const question = (raw.question as string)?.trim();
  if (!question) return null;

  const media = (raw.img as string) || undefined;
  const answers: { text: string; isCorrect: boolean }[] = [];

  if (gameId === 'Yd0mqvfhejqye8k1H0oy') {
    // Multi-answer format: trueAnswers[], wrongAnswers[]
    const trueAns = raw.trueAnswers as unknown[];
    const wrongAns = raw.wrongAnswers as unknown[];
    if (Array.isArray(trueAns)) trueAns.forEach(a => { const s = String(a || '').trim(); if (s) answers.push({ text: s, isCorrect: true }); });
    if (Array.isArray(wrongAns)) wrongAns.forEach(a => { const s = String(a || '').trim(); if (s) answers.push({ text: s, isCorrect: false }); });
  } else {
    // Standard format: realAnswer + fakeAnswer1/2/3
    const real = String((raw.realAnswer || raw.answer || '')).trim();
    if (real) answers.push({ text: real, isCorrect: true });

    for (const key of ['fakeAnswer1', 'fakeAnswer2', 'fakeAnswer3']) {
      const fake = String(raw[key] || '').trim();
      if (fake) answers.push({ text: fake, isCorrect: false });
    }
  }

  if (answers.length < 2) return null; // Need at least correct + 1 wrong

  return {
    text: question,
    hint: (raw.preQuestionText as string)?.trim() || undefined,
    media,
    answers,
  };
}

// ─── Station settings builder ───

function buildStationSettings(cfg: Record<string, unknown>, stationType: string): Record<string, unknown> {
  const settings: Record<string, unknown> = {};

  if (stationType === 'video') {
    settings.mediaUrl = cfg.link || '';
    settings.header = cfg.header || '';
    settings.description = cfg.description || '';
  } else if (stationType === 'image') {
    settings.mediaUrl = cfg.url || '';
    settings.header = cfg.header || '';
    settings.description = cfg.description || '';
  } else {
    // text type
    settings.header = cfg.header || cfg.question || '';
    settings.description = cfg.description || '';
    settings.content = cfg.answer || cfg.description || '';
    if (cfg.url) settings.mediaUrl = cfg.url;
    if (cfg.link) settings.link = cfg.link;
    if (cfg.surveyQuestions) settings.surveyQuestions = cfg.surveyQuestions;
    if (cfg.aiPrompt) settings.aiPrompt = cfg.aiPrompt;
  }

  if (cfg.extraHint?.toString().trim()) {
    settings.hint = cfg.extraHint;
  }

  return settings;
}

// ─── Main migration ───

async function migrate() {
  const dryRun = process.argv.includes('--dry-run');
  const jsonPath = path.resolve(__dirname, '../../../firestore-export/customers.json');

  if (!fs.existsSync(jsonPath)) {
    console.error('❌ customers.json not found at:', jsonPath);
    process.exit(1);
  }

  const customers: OldCustomer[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`📦 Loaded ${customers.length} customers from Firestore export`);

  if (!dryRun) {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  }

  let gamesCreated = 0;
  let gamesSkipped = 0;
  let stationsCreated = 0;
  let stationsSkipped = 0;
  const skippedLog: string[] = [];

  for (const customer of customers) {
    const subs = customer._subcollections;
    if (!subs) continue;

    const customerName = customer.name?.trim() || 'Unknown';
    const lang = customer.language || 'he';
    const baseTags = ['imported', customerName, lang];

    // ── Migrate games ──
    for (const gameCfg of subs.gamesConfigurationSets || []) {
      const gameId = gameCfg.gameId;
      const gameName = gameCfg.name?.trim();

      if (!gameId || !gameName) {
        skippedLog.push(`[GAME] Skip unnamed/undefined in customer "${customerName}"`);
        gamesSkipped++;
        continue;
      }

      if (SKIP_GAME_IDS.has(gameId)) {
        skippedLog.push(`[GAME] Skip unsupported type: "${gameName}" (gameId: ${gameId}) from "${customerName}"`);
        gamesSkipped++;
        continue;
      }

      if (!TRIVIA_GAME_IDS.has(gameId)) {
        skippedLog.push(`[GAME] Skip unknown gameId: "${gameName}" (${gameId}) from "${customerName}"`);
        gamesSkipped++;
        continue;
      }

      // Normalize questions
      const rawQuestions = Array.isArray(gameCfg.configurations) ? gameCfg.configurations : [];
      const questions: NormalizedQuestion[] = [];
      for (const raw of rawQuestions) {
        const q = normalizeQuestion(raw as Record<string, unknown>, gameId);
        if (q) questions.push(q);
      }

      if (questions.length === 0) {
        skippedLog.push(`[GAME] Skip empty questions: "${gameName}" from "${customerName}"`);
        gamesSkipped++;
        continue;
      }

      const tags = [...baseTags, 'trivia'];

      const libraryDoc = {
        kind: 'game' as const,
        name: `${gameName}`,
        type: 'trivia',
        description: `Imported from customer "${customerName}" (${questions.length} questions)`,
        customer: customerName,
        lang,
        tags,
        settings: {
          instructions: '',
          questions,
          scoring: {
            correctAnswerPoints: 100,
            wrongAnswerPenalty: 0,
            timeLimitSeconds: undefined,
          },
          shuffleAnswers: true,
        },
      };

      if (dryRun) {
        console.log(`[DRY] Would create library game: "${libraryDoc.name}" (${questions.length}q) tags=[${tags.join(', ')}]`);
      } else {
        await LibraryItem.create(libraryDoc);
      }
      gamesCreated++;
    }

    // ── Migrate component configs → stations ──
    for (const compCfg of subs.componentsConfigurationSets || []) {
      const compId = compCfg.componentId;
      const compName = compCfg.name?.trim();

      if (!compId || !compName) {
        stationsSkipped++;
        continue;
      }

      if (SKIP_COMPONENTS.has(compId)) {
        skippedLog.push(`[STATION] Skip bridge/escape: "${compName}" (compId: ${compId}) from "${customerName}"`);
        stationsSkipped++;
        continue;
      }

      const mapping = COMPONENT_TO_STATION[compId];
      if (!mapping) {
        skippedLog.push(`[STATION] Skip unknown componentId: "${compName}" (${compId}) from "${customerName}"`);
        stationsSkipped++;
        continue;
      }

      const cfg = compCfg.configurations || {};
      const settings = buildStationSettings(cfg, mapping.type);
      const tags = [...baseTags, mapping.category];

      const libraryStationDoc = {
        kind: 'station' as const,
        name: compName,
        type: mapping.type,
        description: (cfg.description as string)?.trim() || `Imported from "${customerName}"`,
        customer: customerName,
        lang,
        tags,
        settings,
      };

      if (dryRun) {
        console.log(`[DRY] Would create library station: "${libraryStationDoc.name}" (${mapping.type}) tags=[${tags.join(', ')}]`);
      } else {
        await LibraryItem.create(libraryStationDoc);
      }
      stationsCreated++;
    }
  }

  // ── Summary ──
  console.log('\n═══════════════════════════════════════');
  console.log(`${dryRun ? '🔍 DRY RUN' : '✅ MIGRATION'} COMPLETE`);
  console.log(`═══════════════════════════════════════`);
  console.log(`Games created:    ${gamesCreated}`);
  console.log(`Games skipped:    ${gamesSkipped}`);
  console.log(`Stations created: ${stationsCreated}`);
  console.log(`Stations skipped: ${stationsSkipped}`);
  console.log(`═══════════════════════════════════════`);

  if (skippedLog.length > 0) {
    console.log(`\n📋 Skipped items (${skippedLog.length}):`);
    skippedLog.forEach((msg) => console.log(`  ${msg}`));
  }

  if (!dryRun) {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
