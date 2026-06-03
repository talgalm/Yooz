#!/usr/bin/env node
/**
 * Create one-item activities per station/game type for the June 2026 QA
 * screenshot pass. Each activity gets a deterministic name "QA-AFTER-<type>"
 * and prints code+name so the Playwright spec can navigate to them.
 *
 * Idempotent: if an activity with the same name already exists, it's reused
 * instead of recreated.
 */

const API = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'admin@yooz.com';
const ADMIN_PASSWORD = 'admin123';

// Hand-picked items from the existing library (`/tmp/stations.json`,
// `/tmp/games.json`). Each entry creates a single-item activity so the
// participant flow lands directly on the screen we want to screenshot.
const TARGETS = [
  { key: 'video',      label: 'QA #1 video station',            item: { type: 'station', ref: '6a062743597920ecdb5f5862' } }, // "גן החושים"
  { key: 'text',       label: 'QA #2 text station',             item: { type: 'station', ref: '6a1730e23529f361bd728f5f' } }, // "ברוכים הבאים..."
  { key: 'collage',    label: 'QA #3-#5 collage station',       item: { type: 'station', ref: '6a0b33cb70134ab30916714a' } }, // "תמונות בגן החושים"
  { key: 'image',      label: 'QA #7-#8 image station + modal', item: { type: 'station', ref: '6a00dc7e597920ecdb5f45bd' } }, // "קופצת קוד 2"
  { key: 'ballGame',   label: 'QA #11 ball-drop game',          item: { type: 'game',    ref: '69ee4c07c85ab2199620d916' } }, // "מה קורה במתנס"
  { key: 'trueFalse',  label: 'QA #12 TrueFalse w/ image',      item: { type: 'game',    ref: '69d505c46c65eaf8da27a2ba' } }, // "נכון או לא טסט #3496"
  { key: 'riddle',     label: 'QA #16-#17 riddle station',      item: { type: 'station', ref: '6a12bc34c82fc5bcc9ea490b' } }, // "חידת הסינמקס"
  { key: 'avatar',     label: 'QA #20 avatar station',          item: { type: 'station', ref: '6a00b7cd597920ecdb5f38d7' } }, // "תחקור חולה"
];

async function api(path, init = {}, token) {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) {
    throw new Error(`${path} → ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  const { token } = await api('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  // Fetch existing activities once so we can reuse by name.
  const { activities } = await api('/admin/activities', {}, token);
  const byName = new Map(activities.map((a) => [a.name, a]));

  const results = [];
  for (const target of TARGETS) {
    const name = `QA-AFTER-${target.key}`;
    let activity = byName.get(name);
    if (activity) {
      console.log(`reuse  ${target.key.padEnd(10)} ${activity.code}  (${name})`);
    } else {
      const payload = {
        name,
        status: 'preview',
        loginFields: ['name'],
        connectionType: 'single',
        module: { type: 'story', items: [target.item], theme: 'nature' },
      };
      const created = await api('/admin/activities', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, token);
      activity = created.activity;
      console.log(`create ${target.key.padEnd(10)} ${activity.code}  (${name})`);
    }
    results.push({ key: target.key, label: target.label, code: activity.code });
  }

  // Emit a small JSON map the Playwright spec will read.
  const fs = await import('node:fs');
  const out = '/Users/tal/Desktop/yooz/walkthroughs/qa-activities.json';
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
