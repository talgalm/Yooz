// Run: npx tsx --test src/components/games/BallGame/customizedTimer.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// The ball game's countdown is a classic browser script (a global function, no
// exports), so run it in a sandbox with a fake clock. Not node:test's mock timers:
// those keep an interval alive when it is cleared from inside its own callback,
// which is exactly how the countdown stops at 0.
const source = readFileSync(
  new URL('../../../../public/assets/games/ballgame/js/customizedTimer.js', import.meta.url),
  'utf8'
);

type CustomizedTimer = {
  startTimer(): void;
  resetTimer(duration: number): void;
  pauseTimer(): void;
  playTimer(): void;
  destoryTimer(): void;
};

type Interval = { fn: () => void; ms: number; due: number };

function makeTimer(duration: number) {
  const ticks: number[] = [];
  const intervals = new Map<number, Interval>();
  let now = 0;
  let nextId = 1;

  const sandbox: Record<string, unknown> = {
    onTick: (n: number) => ticks.push(n),
    setInterval: (fn: () => void, ms: number) => {
      intervals.set(nextId, { fn, ms, due: now + ms });
      return nextId++;
    },
    clearInterval: (id: number | null) => {
      if (id != null) intervals.delete(id);
    },
  };
  vm.runInNewContext(`${source}\nthis.timer = new CustomizedTimer(onTick, ${duration});`, sandbox);

  const advance = (ms: number) => {
    const end = now + ms;
    for (;;) {
      let next: Interval | undefined;
      for (const entry of intervals.values()) {
        if (entry.due <= end && (!next || entry.due < next.due)) next = entry;
      }
      if (!next) break;
      now = next.due;
      next.due += next.ms;
      next.fn();
    }
    now = end;
  };

  return { timer: sandbox.timer as CustomizedTimer, ticks, advance };
}

test('counts down once a second and stops at 0', () => {
  const { timer, ticks, advance } = makeTimer(3);
  timer.startTimer();
  timer.startTimer(); // starting twice must not leave a second interval running
  advance(10_000);
  assert.deepEqual(ticks, [3, 2, 1, 0]);
});

test('a destroyed timer stays stopped when the tab becomes visible again', () => {
  // Answering destroys the countdown. The visibility handler used to revive it,
  // run it down to 0 and play the fail sound over the bonus throw.
  const { timer, ticks, advance } = makeTimer(5);
  timer.startTimer();
  advance(2000);
  timer.destoryTimer();
  timer.pauseTimer();
  timer.playTimer();
  advance(10_000);
  assert.deepEqual(ticks, [5, 4, 3]);
});

test('pause and play resume from the remaining time', () => {
  const { timer, ticks, advance } = makeTimer(4);
  timer.startTimer();
  advance(1000);
  timer.pauseTimer();
  advance(5000);
  timer.playTimer();
  timer.playTimer(); // a second "visible" with no "hidden" in between
  advance(10_000);
  assert.deepEqual(ticks, [4, 3, 2, 1, 0]);
});

test('resetTimer restarts the same timer from the full duration', () => {
  const { timer, ticks, advance } = makeTimer(3);
  timer.startTimer();
  advance(1000);
  timer.destoryTimer();
  timer.resetTimer(3);
  advance(10_000);
  assert.deepEqual(ticks, [3, 2, 3, 2, 1, 0]);
});
