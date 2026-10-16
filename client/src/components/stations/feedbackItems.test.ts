import { test } from 'node:test';
import assert from 'node:assert/strict';
import { combinedNotes, feedbackItemsFrom, feedbackItemsToSave } from './feedbackItems';

test('a station saved before the ordered list keeps its sliders and the text field at the end', () => {
  assert.deepEqual(feedbackItemsFrom({ questions: [{ text: 'א' }, { text: 'ב' }], notesPlaceholder: 'עוד?' }), [
    { type: 'slider', text: 'א' },
    { type: 'slider', text: 'ב' },
    { type: 'text', text: '', placeholder: 'עוד?' },
  ]);
  assert.deepEqual(feedbackItemsFrom({ questions: [{ text: 'א' }], notesEnabled: false }), [{ type: 'slider', text: 'א' }]);
  assert.deepEqual(feedbackItemsFrom({}), [{ type: 'text', text: '', placeholder: '' }]);
});

test('the ordered list wins and drops anything it does not know', () => {
  const items = [{ type: 'text', text: 'מה הכי אהבתם?', placeholder: '' }, { type: 'slider', text: 'כמה נהניתם?' }, { type: 'video' }, null];
  assert.deepEqual(feedbackItemsFrom({ items, questions: [{ text: 'ישן' }] }), [
    { type: 'text', text: 'מה הכי אהבתם?', placeholder: '' },
    { type: 'slider', text: 'כמה נהניתם?' },
  ]);
});

test('saving keeps the order and writes the old fields for anything that still reads them', () => {
  const saved = feedbackItemsToSave([
    { type: 'text', text: ' פתיחה ', placeholder: ' כתבו כאן ' },
    { type: 'slider', text: '  ' },
    { type: 'slider', text: 'כמה נהניתם?' },
    { type: 'text', text: '', placeholder: '' },
  ]);
  assert.deepEqual(saved.items, [
    { type: 'text', text: 'פתיחה', placeholder: 'כתבו כאן' },
    { type: 'slider', text: 'כמה נהניתם?' },
    { type: 'text', text: '', placeholder: '' },
  ]);
  assert.deepEqual(saved.questions, [{ text: 'כמה נהניתם?' }]);
  assert.equal(saved.notesEnabled, true);
  assert.equal(saved.notesPlaceholder, 'כתבו כאן');
  assert.equal(feedbackItemsToSave([{ type: 'slider', text: 'א' }]).notesEnabled, false);
});

test('several text answers reach the notes column with their question', () => {
  assert.equal(combinedNotes([{ prompt: 'מה אהבתם?', text: 'הכל' }]), 'הכל');
  assert.equal(combinedNotes([{ prompt: 'מה אהבתם?', text: 'הכל' }, { prompt: '', text: '' }, { prompt: 'מה לשפר?', text: 'כלום' }]), 'מה אהבתם?: הכל\nמה לשפר?: כלום');
  assert.equal(combinedNotes([{ prompt: 'א', text: ' ' }]), '');
});
