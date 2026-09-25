import assert from 'node:assert/strict';

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

{
  reset();
  store.set('yooz_token', 'participant-jwt');
  enqueueOfflineRequest(SCORES, { method: 'POST', body });
  store.delete('yooz_token');
  await flushOfflineQueue();
  assert.equal(sent.length, 1, 'queued write should be sent');
  assert.equal(sent[0].auth, 'Bearer participant-jwt', 'must reuse the token captured at enqueue time');
  assert.equal(isRequestQueued(SCORES), false, 'delivered write should leave the queue');
}

{
  reset();
  store.set('yooz_token', 'participant-jwt');
  respond = () => new Response('{"error":"Forbidden"}', { status: 403 });
  enqueueOfflineRequest(SCORES, { method: 'POST', body });
  await flushOfflineQueue();
  assert.equal(isRequestQueued(SCORES), false, '4xx must not stay queued');
}

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
