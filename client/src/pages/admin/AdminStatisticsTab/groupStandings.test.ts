import test from 'node:test';
import assert from 'node:assert/strict';
import { groupWinners, podiumSteps, rankGroups } from './groupStandings';

const groups = [
  { group: 'Blue', totalScore: 340 },
  { group: 'Red', totalScore: 520 },
  { group: 'Green', totalScore: 340 },
  { group: 'Gold', totalScore: 90 },
];

test('groups rank by their total score, and a tie shares the place', () => {
  assert.deepEqual(rankGroups(groups).map((g) => `${g.rank}:${g.group}`), ['1:Red', '2:Blue', '2:Green', '4:Gold']);
});

test('the winner is the highest total, every group in a tie, and nobody before anyone scores', () => {
  assert.deepEqual(groupWinners(groups).map((g) => g.group), ['Red']);
  assert.deepEqual(groupWinners([{ group: 'A', totalScore: 50 }, { group: 'B', totalScore: 50 }]).map((g) => g.group), ['A', 'B']);
  assert.deepEqual(groupWinners([{ group: 'A', totalScore: 0 }]), []);
  assert.deepEqual(groupWinners([]), []);
});

test('the podium takes the top three places, a tie shares a step, and groups without points stay off', () => {
  assert.deepEqual(podiumSteps(groups).map((step) => step.map((g) => g.group)), [['Red'], ['Blue', 'Green']]);
  const three = [{ group: 'A', totalScore: 30 }, { group: 'B', totalScore: 20 }, { group: 'C', totalScore: 10 }, { group: 'D', totalScore: 5 }, { group: 'E', totalScore: 0 }];
  assert.deepEqual(podiumSteps(three).map((step) => step.map((g) => g.group)), [['A'], ['B'], ['C']]);
  assert.deepEqual(podiumSteps([{ group: 'A', totalScore: 10 }, { group: 'B', totalScore: 0 }]).map((step) => step.map((g) => g.group)), [['A']]);
});

test('like the Olympics, a tie for first leaves no second place and ranks past third get no step', () => {
  const tie = [{ group: 'A', totalScore: 9 }, { group: 'B', totalScore: 9 }, { group: 'C', totalScore: 5 }, { group: 'D', totalScore: 1 }];
  assert.deepEqual(podiumSteps(tie).map((step) => step.map((g) => `${g.rank}:${g.group}`)), [['1:A', '1:B'], ['3:C']]);
  const crowded = [{ group: 'A', totalScore: 9 }, { group: 'B', totalScore: 9 }, { group: 'C', totalScore: 9 }, { group: 'D', totalScore: 4 }];
  assert.deepEqual(podiumSteps(crowded).map((step) => step.length), [3]);
});
