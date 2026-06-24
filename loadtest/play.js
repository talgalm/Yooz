// k6 load test — simulates N participants joining an activity, sending progress
// updates, and posting final scores. Does NOT exercise collage (heavy CPU on
// the server — separate test if needed).
//
// Run:
//   BASE=http://localhost:3000 CODE=ABC123 k6 run loadtest/play.js
//   BASE=https://staging.example.com CODE=ABC123 VUS=100 DURATION=5m k6 run loadtest/play.js
//
// Optional flags via env:
//   STATIONS=5     how many progress PATCHes per VU before scoring
//   THINK=2        avg seconds between station completions (jittered)
//
// Required: the activity at CODE must already exist with loginFields including
// 'name'. Use a throwaway/staging activity — every VU creates a Report.

import http from 'k6/http';
import { sleep, check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE = __ENV.BASE || 'http://localhost:3000';
const CODE = __ENV.CODE;
const VUS = Number(__ENV.VUS || 100);
const DURATION = __ENV.DURATION || '3m';
const STATIONS = Number(__ENV.STATIONS || 5);
const THINK = Number(__ENV.THINK || 2);
// If set, all VUs join under this group name (required when the activity is
// connectionType=group). If the group doesn't exist, setup() creates it.
const GROUP = __ENV.GROUP || `loadtest_${Date.now().toString(36)}`;

if (!CODE) throw new Error('CODE env var is required (activity code)');

export const options = {
  scenarios: {
    play: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: VUS },     // ramp up
        { duration: DURATION, target: VUS },  // hold
        { duration: '15s', target: 0 },       // drain
      ],
      gracefulStop: '30s',
    },
  },
  thresholds: {
    'login_ok': ['rate>0.95'],
    'progress_ok': ['rate>0.95'],
    'scores_ok': ['rate>0.95'],
    'http_req_duration{name:login}': ['p(95)<3000'],
    'http_req_duration{name:progress}': ['p(95)<2000'],
    'http_req_duration{name:scores}': ['p(95)<3000'],
  },
};

const loginOk = new Rate('login_ok');
const progressOk = new Rate('progress_ok');
const scoresOk = new Rate('scores_ok');
const finishedTrend = new Trend('finish_duration_ms');

// Probe activity once. Create a group if the activity is group-mode and the
// chosen group doesn't exist yet. Returns config the VUs need to log in.
export function setup() {
  const probe = http.get(`${BASE}/api/activities/${CODE}`);
  if (probe.status !== 200) {
    throw new Error(`Activity ${CODE} probe failed: ${probe.status} ${probe.body}`);
  }
  const cfg = probe.json();
  const isGroup = cfg.connectionType === 'group';
  if (!isGroup) return { group: undefined };

  // Try to create the group — 409 means it already exists, which is fine.
  const create = http.post(
    `${BASE}/api/activities/${CODE}/groups`,
    JSON.stringify({ name: GROUP, participantName: 'loadtest_seed' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (create.status !== 200 && create.status !== 201 && create.status !== 409) {
    throw new Error(`Group create failed: ${create.status} ${create.body}`);
  }
  console.log(`setup: activity=${CODE} group=${GROUP} (status=${create.status})`);
  return { group: GROUP };
}

export default function (data) {
  const start = Date.now();
  const botName = `bot_${__VU}_${__ITER}_${Math.random().toString(36).slice(2, 7)}`;

  // 1. Join
  const loginBody = { activityCode: CODE, participantName: botName };
  if (data?.group) loginBody.group = data.group;
  const loginRes = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify(loginBody),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } },
  );
  const okLogin = check(loginRes, {
    'login 200': r => r.status === 200,
    'has token': r => !!r.json('token'),
  });
  loginOk.add(okLogin);
  if (!okLogin) { sleep(1); return; }

  const token = loginRes.json('token');
  const auth = {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  };

  // 2. Progress PATCHes — one per station
  for (let i = 0; i < STATIONS; i++) {
    const res = http.patch(
      `${BASE}/api/activities/${CODE}/progress`,
      JSON.stringify({
        itemResult: { itemIndex: i, score: 10, type: 'station' },
        lastActiveItemIndex: i,
        totalItemsCompleted: i + 1,
        runningTotal: (i + 1) * 10,
      }),
      { ...auth, tags: { name: 'progress' } },
    );
    progressOk.add(check(res, { 'progress 200': r => r.status === 200 }));
    sleep(THINK + Math.random() * THINK);
  }

  // 3. Final scores
  const scoresRes = http.post(
    `${BASE}/api/activities/${CODE}/scores`,
    JSON.stringify({
      scores: Array.from({ length: STATIONS }, (_, i) => ({
        gameName: `station_${i}`,
        score: 10,
      })),
      sessionDurationMs: Date.now() - start,
    }),
    { ...auth, tags: { name: 'scores' } },
  );
  scoresOk.add(check(scoresRes, { 'scores 200': r => r.status === 200 }));

  finishedTrend.add(Date.now() - start);
}

export function handleSummary(data) {
  return {
    'loadtest/last-run.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const m = data.metrics;
  const get = (k, p = 'avg') => m[k]?.values?.[p];
  const pct = (k) => `${((get(k, 'rate') ?? 0) * 100).toFixed(1)}%`;
  return `
=== Yooz load-test summary ===
VUs: ${VUS}    duration: ${DURATION}    stations/VU: ${STATIONS}

login_ok     ${pct('login_ok')}
progress_ok  ${pct('progress_ok')}
scores_ok    ${pct('scores_ok')}

http_req_failed   ${pct('http_req_failed')}
http_req_duration p50=${get('http_req_duration', 'med')?.toFixed(0)}ms p95=${get('http_req_duration', 'p(95)')?.toFixed(0)}ms

finish_duration_ms p50=${get('finish_duration_ms', 'med')?.toFixed(0)}ms p95=${get('finish_duration_ms', 'p(95)')?.toFixed(0)}ms

(full JSON: loadtest/last-run.json)
`;
}
