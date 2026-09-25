import test from 'node:test';
import assert from 'node:assert/strict';
import { teamMarkerColor, teamMarkerLabel } from './teamMarker';

test('a team marker reads as the team number, else the start of its last word', () => {
  assert.equal(teamMarkerLabel('קבוצה 2'), '2');
  assert.equal(teamMarkerLabel('קבוצה 12'), '12');
  assert.equal(teamMarkerLabel('קבוצה אדומה'), 'אד');
  assert.equal(teamMarkerLabel('קבוצת הנמרים'), 'הנ');
  assert.equal(teamMarkerLabel('  הנשרים '), 'הנ');
});

test('numbered teams get distinct colours, and a name always gets the same one', () => {
  const colors = ['קבוצה 1', 'קבוצה 2', 'קבוצה 3', 'קבוצה 4', 'קבוצה 5', 'קבוצה 6'].map(teamMarkerColor);
  assert.equal(new Set(colors).size, 6);
  assert.equal(teamMarkerColor('קבוצה אדומה'), teamMarkerColor('קבוצה אדומה'));
});
