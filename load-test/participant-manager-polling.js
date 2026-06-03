/**
 * Manager polling /manager/reports every 5s while 500 participants play through the full flow.
 * Tests Report.find({ activityCode }).sort({ joinedAt: -1 }) under concurrent participant writes.
 * Requires MANAGER_TOKEN env var (obtain via POST /api/manager/login).
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const CODE = __ENV.ACTIVITY_CODE;
const VUS = Number(__ENV.VUS || 500);
const MANAGER_TOKEN = __ENV.MANAGER_TOKEN || '';
const STATIONS = Number(__ENV.STATIONS || 3);
const MIN_THINK = Number(__ENV.MIN_THINK_SEC || 2);
const MAX_THINK = Number(__ENV.MAX_THINK_SEC || 6);

const participantFail = new Rate('custom_participant_fail');
const managerFail = new Rate('custom_manager_fail');
const managerDuration = new Trend('custom_manager_reports_ms', true);

export const options = {
  scenarios: {
    participants: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: VUS },
        { duration: '4m', target: VUS },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'participantFlow',
    },
    manager: {
      executor: 'constant-arrival-rate',
      rate: 12,        // 12 polls per minute = every 5s
      timeUnit: '1m',
      duration: '5m30s',
      preAllocatedVUs: 2,
      exec: 'managerPoll',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    custom_manager_fail: ['rate<0.02'],
    custom_manager_reports_ms: ['p(95)<5000'],
  },
};

function authHeaders(token) {
  return {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  };
}

function randomIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function setup() {
  if (!CODE) throw new Error('ACTIVITY_CODE required');
  if (!MANAGER_TOKEN) {
    console.warn('MANAGER_TOKEN not set — manager scenario will get 401s (still measures latency)');
  }
}

export function participantFlow() {
  const name = `mgr-poll-${__VU}-${Date.now()}`;

  const loginRes = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ activityCode: CODE, participantName: name }),
    { tags: { endpoint: 'login' }, headers: { 'Content-Type': 'application/json' } },
  );
  if (!check(loginRes, { 'login 200': (r) => r.status === 200 })) {
    participantFail.add(1);
    return;
  }
  const token = loginRes.json('token');

  http.get(`${BASE}/api/activities/${CODE}/module`, {
    ...authHeaders(token),
    tags: { endpoint: 'module' },
  });

  for (let i = 0; i < STATIONS; i++) {
    sleep(randomIntBetween(MIN_THINK, MAX_THINK));

    const progressRes = http.patch(
      `${BASE}/api/activities/${CODE}/progress`,
      JSON.stringify({
        itemResult: { itemIndex: i, score: 80, gameName: `game-${i}` },
        totalItemsCompleted: i + 1,
        lastActiveItemIndex: i,
        runningTotal: (i + 1) * 80,
      }),
      { ...authHeaders(token), tags: { endpoint: 'progress' } },
    );
    participantFail.add(!check(progressRes, { 'progress 200': (r) => r.status === 200 }));
  }

  const scoresRes = http.post(
    `${BASE}/api/activities/${CODE}/scores`,
    JSON.stringify({
      scores: Array.from({ length: STATIONS }, (_, i) => ({ gameName: `game-${i}`, score: 80 })),
      sessionDurationMs: randomIntBetween(60000, 180000),
    }),
    { ...authHeaders(token), tags: { endpoint: 'scores' } },
  );
  participantFail.add(!check(scoresRes, { 'scores 200': (r) => r.status === 200 }));

  http.get(`${BASE}/api/activities/${CODE}/leaderboard`, {
    tags: { endpoint: 'leaderboard' },
  });
}

export function managerPoll() {
  const headers = MANAGER_TOKEN
    ? { Authorization: `Bearer ${MANAGER_TOKEN}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  const res = http.get(`${BASE}/api/manager/reports`, {
    headers,
    tags: { endpoint: 'manager-reports' },
  });

  const ok = check(res, { 'manager-reports 200': (r) => r.status === 200 });
  managerFail.add(!ok);
  managerDuration.add(res.timings.duration);
}
