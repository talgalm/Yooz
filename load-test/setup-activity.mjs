#!/usr/bin/env node
/**
 * Create (or reuse) a dedicated load-test activity on the target environment.
 * Creates 3 minimal trivia games + a 3-station story module. Name-only login.
 *
 * Usage:
 *   node load-test/setup-activity.mjs
 *   BASE_URL=https://yooz.org.il node load-test/setup-activity.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  LOAD_TEST_DIR,
  api,
  loadEnvFile,
  saveConfig,
} from './lib/shared.mjs';

loadEnvFile();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.LOAD_TEST_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@yooz.com';
const ADMIN_PASSWORD = process.env.LOAD_TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'admin123';
const ACTIVITY_NAME = 'LOADTEST-RESILIENCE';
const MANAGER_EMAIL = 'loadtest-manager@yooz.com';
const MANAGER_PASSWORD = 'LoadTestManager1!';

const MINIMAL_TRIVIA = {
  type: 'trivia',
  settings: {
    questions: [
      { text: 'Load test Q1?', answers: ['A', 'B', 'C', 'D'], correctAnswer: 1, points: 10 },
      { text: 'Load test Q2?', answers: ['A', 'B', 'C', 'D'], correctAnswer: 0, points: 10 },
    ],
    timeLimit: 60,
  },
};

async function main() {
  console.log(`\n🔧 Load test setup → ${BASE_URL}\n`);

  const { token } = await api(BASE_URL, '/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  const { activities } = await api(BASE_URL, '/api/admin/activities', {}, token);
  let activity = activities.find((a) => a.name === ACTIVITY_NAME);

  if (activity) {
    console.log(`♻️  Reusing activity "${ACTIVITY_NAME}" → code ${activity.code}`);
    // Ensure manager credentials are set (idempotent)
    await api(BASE_URL, `/api/admin/activities/${activity._id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: activity.name,
        loginFields: activity.loginFields,
        connectionType: activity.connectionType,
        status: activity.status,
        managerEmail: MANAGER_EMAIL,
        managerPassword: MANAGER_PASSWORD,
      }),
    }, token);
    console.log(`  manager credentials set`);
  } else {
    console.log('Creating 3 minimal trivia games…');
    const gameIds = [];
    for (let i = 1; i <= 3; i++) {
      const { game } = await api(BASE_URL, '/api/admin/games', {
        method: 'POST',
        body: JSON.stringify({
          name: `LoadTest Trivia ${i}`,
          ...MINIMAL_TRIVIA,
          customer: 'Load Test',
        }),
      }, token);
      gameIds.push(game._id);
      console.log(`  • game ${i}: ${game._id}`);
    }

    const payload = {
      name: ACTIVITY_NAME,
      status: 'live',
      loginFields: ['name'],
      connectionType: 'single',
      managerEmail: MANAGER_EMAIL,
      managerPassword: MANAGER_PASSWORD,
      module: {
        type: 'story',
        theme: 'nature',
        items: gameIds.map((ref) => ({ type: 'game', ref })),
      },
    };

    const created = await api(BASE_URL, '/api/admin/activities', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
    activity = created.activity;
    console.log(`✅ Created activity → code ${activity.code}`);
  }

  // Ensure live (wipes old load-test reports if re-promoting)
  if (activity.status !== 'live') {
    await api(BASE_URL, `/api/admin/activities/${activity._id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'live' }),
    }, token);
    console.log('Set status → live');
  }

  // Get manager token
  let managerToken = null;
  try {
    const { token: mToken } = await api(BASE_URL, '/api/manager/login', {
      method: 'POST',
      body: JSON.stringify({ activityCode: activity.code, email: MANAGER_EMAIL, password: MANAGER_PASSWORD }),
    });
    managerToken = mToken;
    console.log(`  manager token obtained`);
  } catch (err) {
    console.warn(`  ⚠️  Could not get manager token: ${err.message}`);
  }

  const config = {
    baseUrl: BASE_URL,
    activityCode: activity.code,
    activityId: activity._id,
    activityName: ACTIVITY_NAME,
    stations: 3,
    managerEmail: MANAGER_EMAIL,
    ...(managerToken && { managerToken }),
    createdAt: new Date().toISOString(),
  };
  saveConfig(config);

  // Write MANAGER_TOKEN to load-test/.env so k6 scripts pick it up
  if (managerToken) {
    const envPath = path.join(LOAD_TEST_DIR, '.env');
    const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const updated = existing.replace(/^MANAGER_TOKEN=.*$/m, '').trimEnd();
    fs.writeFileSync(envPath, `${updated}\nMANAGER_TOKEN=${managerToken}\n`.trimStart());
    console.log(`  MANAGER_TOKEN written to load-test/.env`);
  }

  console.log(`\n📝 Saved load-test/config.json`);
  console.log(`   Activity code: ${activity.code}`);
  console.log(`   Manager:       ${MANAGER_EMAIL}`);
  console.log(`   Play URL:      ${BASE_URL.replace(/\/$/, '')}/play/${activity.code}`);
  console.log('\nNext: npm run load-test:run\n');
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
