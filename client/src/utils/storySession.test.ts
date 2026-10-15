import { test } from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  private items = new Map<string, string>();
  get length() { return this.items.size; }
  key(index: number) { return [...this.items.keys()][index] ?? null; }
  getItem(key: string) { return this.items.get(key) ?? null; }
  setItem(key: string, value: string) { this.items.set(key, value); }
  removeItem(key: string) { this.items.delete(key); }
}

Object.assign(globalThis, { localStorage: new MemoryStorage(), sessionStorage: new MemoryStorage() });

const { loadStorySessionRaw, saveStorySessionRaw, forgetAllStorySessions } = await import('./storySession');
const { newParticipantSessionId } = await import('./participantActivity');

test('a new login starts the activity from scratch on the same phone', () => {
  newParticipantSessionId();
  saveStorySessionRaw('abc123', JSON.stringify({ currentItemIndex: 4 }));
  assert.equal(JSON.parse(loadStorySessionRaw('abc123') ?? '{}').currentItemIndex, 4);

  newParticipantSessionId();
  assert.equal(loadStorySessionRaw('abc123'), null);
});

test('logging in clears every saved story session', () => {
  saveStorySessionRaw('abc123', '{}');
  saveStorySessionRaw('xyz789', '{}');
  forgetAllStorySessions();
  assert.equal(loadStorySessionRaw('abc123'), null);
  assert.equal(loadStorySessionRaw('xyz789'), null);
  assert.equal(localStorage.length, 1);
});
