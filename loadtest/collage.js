// k6 collage load test — each VU runs a full collage job end-to-end with its
// own synthetic splitGroupId, so N VUs trigger N independent ffmpeg encodes on
// the server.
//
// Flow per VU:
//   1. login (group activity)
//   2. POST /api/collage/jobs           — create job
//   3. POST /api/collage/upload-photo   ×6  (3 + 3 split parts, all in one VU)
//   4. POST /api/collage/upload-title
//   5. POST /api/collage/jobs/:id/start — schedules ffmpeg encode
//   6. GET  /api/collage/progress/:id   — poll until done/error/timeout
//
// Ramp: 10 → 25 → 50 → 100. Aborts via thresholds when failure rate >10% or
// p95 >30s on any step. That's the "breaking point" signal.
//
// Run:
//   k6 run -e BASE=https://yooz.org.il -e CODE=17djn8 loadtest/collage.js
//
// Throttled / bad-signal variant:
//   k6 run -e BASE=https://yooz.org.il -e CODE=17djn8 -e SLOW=1 loadtest/collage.js

import http from 'k6/http';
import { sleep, check } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE = __ENV.BASE || 'http://localhost:3000';
const CODE = __ENV.CODE;
const TEMPLATE = __ENV.TEMPLATE || 'gan-yehoshua';
const REQUIRED_IMAGES = Number(__ENV.REQUIRED_IMAGES || 6);
const POLL_INTERVAL = Number(__ENV.POLL_INTERVAL || 3);   // seconds
// Default 10min: under heavy concurrent load on t3.medium, ffmpeg encodes
// serialize on the 1-2 vCPU and 2-3min single-job time stretches to 5-8min.
const POLL_TIMEOUT = Number(__ENV.POLL_TIMEOUT || 600);   // seconds
const GROUP = __ENV.GROUP || `collage_load_${Date.now().toString(36)}`;
const LOGO_URL = __ENV.LOGO_URL || 'https://res.cloudinary.com/drhc5tpmg/image/upload/v1779896769/yooz/aubdkrb6uwrg8ud4lrfn.png';
const SLOW = __ENV.SLOW === '1';   // bad-signal mode: add jitter + drop tolerance

if (!CODE) throw new Error('CODE env var is required');

// Open once at init — k6 shares across VUs.
const TEST_JPEG = open('./fixtures/test.jpg', 'b');

export const options = {
  scenarios: {
    collage: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m',  target: 10 },
        { duration: '30s', target: 25 },
        { duration: '1m',  target: 25 },
        { duration: '30s', target: 50 },
        { duration: '2m',  target: 50 },
        { duration: '30s', target: 100 },
        { duration: '3m',  target: 100 },
        { duration: '30s', target: 0 },
      ],
      gracefulStop: '60s',
    },
  },
  thresholds: {
    'collage_completed': ['rate>0.80'],
    'http_req_failed':   ['rate<0.10'],
    'http_req_duration{name:upload_photo}': ['p(95)<20000'],
    'http_req_duration{name:start}':        ['p(95)<5000'],
  },
};

const completed = new Rate('collage_completed');
const errored   = new Rate('collage_errored');
const timedOut  = new Rate('collage_timedout');
const encodeMs  = new Trend('encode_duration_ms');
const totalMs   = new Trend('total_duration_ms');
const pollCount = new Counter('poll_total');

export function setup() {
  const probe = http.get(`${BASE}/api/activities/${CODE}`);
  if (probe.status !== 200) {
    throw new Error(`Activity probe failed: ${probe.status} ${probe.body}`);
  }
  const cfg = probe.json();
  const isGroup = cfg.connectionType === 'group';
  if (!isGroup) return { group: undefined };

  const create = http.post(
    `${BASE}/api/activities/${CODE}/groups`,
    JSON.stringify({ name: GROUP, participantName: 'collage_seed' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (![200, 201, 409].includes(create.status)) {
    throw new Error(`Group create failed: ${create.status} ${create.body}`);
  }
  console.log(`setup: code=${CODE} group=${GROUP} status=${create.status} SLOW=${SLOW}`);
  return { group: GROUP };
}

function jitter(min, max) {
  if (!SLOW) return;
  sleep(min + Math.random() * (max - min));
}

export default function (data) {
  const start = Date.now();
  const vu = __VU;
  const iter = __ITER;
  const botName = `cbot_${vu}_${iter}_${Math.random().toString(36).slice(2, 7)}`;
  // Unique splitGroupId per VU+iter → unique jobId → independent encode.
  const splitGroupId = `loadtest_${vu}_${iter}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`.slice(0, 64);
  const jobId = `j_${CODE}_${splitGroupId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 90);

  // 1. Login
  const loginBody = { activityCode: CODE, participantName: botName };
  if (data?.group) loginBody.group = data.group;
  const login = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify(loginBody),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } },
  );
  if (!check(login, { 'login 200': r => r.status === 200 })) {
    errored.add(1); completed.add(0); return;
  }

  // 2. Create job
  const createJob = http.post(
    `${BASE}/api/collage/jobs`,
    JSON.stringify({
      jobId,
      activityCode: CODE,
      template: TEMPLATE,
      splitGroupId,
      logoUrl: LOGO_URL,
      title: `bot ${vu}`,
      requiredImages: REQUIRED_IMAGES,
    }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'create_job' } },
  );
  if (!check(createJob, { 'create_job 2xx': r => r.status === 200 || r.status === 201 })) {
    console.log(`vu=${vu} create_job ${createJob.status} ${createJob.body?.slice(0,160)}`);
    errored.add(1); completed.add(0); return;
  }

  // 3. Upload 6 photos (one at a time — mimics real client which has concurrency=3,
  // but k6 VUs already provide parallelism between VUs).
  for (let i = 0; i < REQUIRED_IMAGES; i++) {
    jitter(0.2, 1.5);
    const fd = {
      file: http.file(TEST_JPEG, `photo_${i}.jpg`, 'image/jpeg'),
      activityCode: CODE,
      jobId,
      imageIndex: String(i),
    };
    const up = http.post(`${BASE}/api/collage/upload-photo`, fd, {
      tags: { name: 'upload_photo' },
      timeout: '60s',
    });
    if (up.status !== 200) {
      console.log(`vu=${vu} upload_photo[${i}] ${up.status} ${up.body?.slice(0,120)}`);
      errored.add(1); completed.add(0); return;
    }
  }

  // 4. Upload title image (same test jpg)
  const titleUp = http.post(`${BASE}/api/collage/upload-title`, {
    file: http.file(TEST_JPEG, 'title.png', 'image/png'),
    activityCode: CODE,
    jobId,
  }, { tags: { name: 'upload_title' }, timeout: '60s' });
  if (titleUp.status !== 200) {
    errored.add(1); completed.add(0); return;
  }

  // 5. Start encode
  const startRes = http.post(
    `${BASE}/api/collage/jobs/${jobId}/start`,
    JSON.stringify({ title: `bot ${vu}` }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'start' } },
  );
  if (![200, 202].includes(startRes.status)) {
    errored.add(1); completed.add(0); return;
  }
  const encodeStart = Date.now();

  // 6. Poll progress
  const deadline = Date.now() + POLL_TIMEOUT * 1000;
  let final = null;
  while (Date.now() < deadline) {
    sleep(POLL_INTERVAL);
    const prog = http.get(`${BASE}/api/collage/progress/${jobId}`, { tags: { name: 'progress' } });
    pollCount.add(1);
    if (prog.status !== 200) continue;
    const snap = prog.json();
    if (snap.phase === 'done') { final = 'done'; break; }
    // Treat error-field-set as terminal too — guards against pre-fix prod
    // where the late ffmpeg progress callback could overwrite phase=error
    // back to phase=encoding.
    if (snap.phase === 'error' || snap.error) { final = 'error'; break; }
  }

  const encodeDur = Date.now() - encodeStart;
  const totalDur = Date.now() - start;
  if (final === 'done') {
    completed.add(1);
    encodeMs.add(encodeDur);
    totalMs.add(totalDur);
  } else if (final === 'error') {
    completed.add(0); errored.add(1);
  } else {
    completed.add(0); timedOut.add(1);
  }
}

export function handleSummary(data) {
  return {
    'loadtest/last-collage-run.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const m = data.metrics;
  const g = (k, p = 'avg') => m[k]?.values?.[p];
  const fmt = (v, sfx = 'ms') => v == null ? 'n/a' : `${v.toFixed(0)}${sfx}`;
  const pct = (k) => `${((g(k, 'rate') ?? 0) * 100).toFixed(1)}%`;
  return `
=== Yooz COLLAGE load-test summary ===
mode: ${SLOW ? 'THROTTLED (SLOW=1)' : 'CLEAN'}

iterations:        ${(g('iterations', 'count') ?? 0).toFixed(0)}
collage_completed: ${pct('collage_completed')}
collage_errored:   ${pct('collage_errored')}
collage_timedout:  ${pct('collage_timedout')}
http_req_failed:   ${pct('http_req_failed')}

per-step p95:
  login        ${fmt(g('http_req_duration{name:login}', 'p(95)'))}
  create_job   ${fmt(g('http_req_duration{name:create_job}', 'p(95)'))}
  upload_photo ${fmt(g('http_req_duration{name:upload_photo}', 'p(95)'))}
  upload_title ${fmt(g('http_req_duration{name:upload_title}', 'p(95)'))}
  start        ${fmt(g('http_req_duration{name:start}', 'p(95)'))}
  progress     ${fmt(g('http_req_duration{name:progress}', 'p(95)'))}

encode_duration  p50=${fmt(g('encode_duration_ms', 'med'))} p95=${fmt(g('encode_duration_ms', 'p(95)'))} max=${fmt(g('encode_duration_ms', 'max'))}
total_duration   p50=${fmt(g('total_duration_ms', 'med'))} p95=${fmt(g('total_duration_ms', 'p(95)'))} max=${fmt(g('total_duration_ms', 'max'))}
polls per job:   avg=${(g('poll_total','count')/Math.max(1,g('iterations','count'))).toFixed(1)}

(full JSON: loadtest/last-collage-run.json)
`;
}
