/**
 * Edge case: 1000 users logged in, then ALL submit final scores in the same ~5s window.
 * Simulates "everyone finished the last station at the same time".
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const CODE = __ENV.ACTIVITY_CODE;
const VUS = Number(__ENV.VUS || 1000);
const WAVE_AT_SEC = Number(__ENV.WAVE_AT_SEC || 90);
const STATIONS = Number(__ENV.STATIONS || 3);

const scoresFail = new Rate('custom_scores_fail');
const scoresDuration = new Trend('custom_scores_ms', true);

export const options = {
  scenarios: {
    wave: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: __ENV.MAX_DURATION || '5m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.15'],
    custom_scores_fail: ['rate<0.15'],
  },
};

const testStartMs = Date.now();

function authHeaders(token) {
  return {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  };
}

function waitUntilWave() {
  const elapsed = (Date.now() - testStartMs) / 1000;
  if (elapsed < WAVE_AT_SEC) sleep(WAVE_AT_SEC - elapsed);
}

export function setup() {
  if (!CODE) throw new Error('ACTIVITY_CODE required');
}

export default function () {
  const name = `wscore-${__VU}-${Date.now()}`;

  const loginRes = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ activityCode: CODE, participantName: name }),
    { tags: { endpoint: 'login' }, headers: { 'Content-Type': 'application/json' } },
  );
  if (!check(loginRes, { 'login 200': (r) => r.status === 200 })) return;
  const token = loginRes.json('token');

  // Save incremental progress for each station first
  for (let i = 0; i < STATIONS; i++) {
    http.patch(
      `${BASE}/api/activities/${CODE}/progress`,
      JSON.stringify({
        itemResult: { itemIndex: i, score: 80, gameName: `game-${i}` },
        totalItemsCompleted: i + 1,
        lastActiveItemIndex: i,
        runningTotal: (i + 1) * 80,
      }),
      { ...authHeaders(token), tags: { endpoint: 'progress' } },
    );
    sleep(0.1);
  }

  waitUntilWave();

  // All VUs submit final scores at the same moment
  const scores = Array.from({ length: STATIONS }, (_, i) => ({
    gameName: `game-${i}`,
    score: 80,
  }));

  const res = http.post(
    `${BASE}/api/activities/${CODE}/scores`,
    JSON.stringify({ scores, sessionDurationMs: 120000 }),
    { ...authHeaders(token), tags: { endpoint: 'scores' } },
  );
  const ok = check(res, { 'scores 200': (r) => r.status === 200 });
  scoresFail.add(!ok);
  scoresDuration.add(res.timings.duration);
}
