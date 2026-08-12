/**
 * Self-check for the offline write queue — the path that carries a participant's
 * final scores when the network drops at the finish screen.
 *
 *   npx tsx client/src/utils/offlineQueue.selfcheck.ts
 *
 * No framework on purpose: stub the two browser globals the queue touches,
 * assert the three behaviours that lose scores when they regress.
 */
import assert from 'node:assert/strict';

// ─── browser stubs ───
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
(globalThis as Record<string, unknown>).navigator = { onLine: true };

type Sent = { url: string; auth: string | undefined };
let sent: Sent[] = [];
let respond: () => Response = () => new Response('{}', { status: 200 });
(globalThis as Record<string, unknown>).fetch = async (url: string, init: RequestInit) => {
  sent.push({ url, auth: (init.headers as Record<string, string>)?.Authorization });
  return respond();
};

const { enqueueOfflineRequest, flushOfflineQueue, isRequestQueued } = await import('./offlineQueue.js');

const SCORES = '/api/activities/abc123/scores';
const body = JSON.stringify({ scores: [{ gameName: 'Avatar', score: 30 }] });
const reset = () => { store.clear(); sent = []; };

// 1. A queued write keeps the token it was created with. Leaving the activity
//    clears yooz_token, and without this the flush sends no Authorization
//    header, 401s forever, and the run's scores are lost.
{
  reset();
  store.set('yooz_token', 'participant-jwt');
  enqueueOfflineRequest(SCORES, { method: 'POST', body });
  store.delete('yooz_token'); // logout / auto-exit countdown fires
  await flushOfflineQueue();
  assert.equal(sent.length, 1, 'queued write should be sent');
  assert.equal(sent[0].auth, 'Bearer participant-jwt', 'must reuse the token captured at enqueue time');
  assert.equal(isRequestQueued(SCORES), false, 'delivered write should leave the queue');
}

// 2. A permanent rejection is dropped, not retried forever. A stuck entry keeps
//    the finish screen's "could not save" banner up on every later run of the
//    same activity, because the banner keys off isRequestQueued().
{
  reset();
  store.set('yooz_token', 'participant-jwt');
  respond = () => new Response('{"error":"Forbidden"}', { status: 403 });
  enqueueOfflineRequest(SCORES, { method: 'POST', body });
  await flushOfflineQueue();
  assert.equal(isRequestQueued(SCORES), false, '4xx must not stay queued');
}

// 3. A transient failure is kept and delivered on the next flush.
{
  reset();
  store.set('yooz_token', 'participant-jwt');
  respond = () => new Response('bad gateway', { status: 502 });
  enqueueOfflineRequest(SCORES, { method: 'POST', body });
  await flushOfflineQueue();
  assert.equal(isRequestQueued(SCORES), true, '502 must stay queued');
  respond = () => new Response('{}', { status: 200 });
  await flushOfflineQueue();
  assert.equal(isRequestQueued(SCORES), false, 'retry should deliver it');
}

console.log('offlineQueue self-check passed');
