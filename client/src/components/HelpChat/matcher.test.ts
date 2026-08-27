import test from 'node:test';
import assert from 'node:assert/strict';
import { matchTopic } from './matcher';

/**
 * The risk when adding topics to this file is keyword collision: a new phrase
 * hijacking an existing topic, or an existing one shadowing the new sheet.
 * These are the sentences from the field troubleshooting sheet plus the
 * neighbours most likely to be stolen from.
 */

function topicOf(input: string, lang: 'en' | 'he') {
  return matchTopic(input, lang)?.topicId ?? null;
}

test('field sheet — Hebrew phrasings route to their own topic', () => {
  assert.equal(topicOf('נזרקתי מהפעילות', 'he'), 'kickedOut');
  assert.equal(topicOf('אין לי קישור לפעילות', 'he'), 'kickedOut');
  assert.equal(topicOf('הכפתור לא עובד', 'he'), 'buttonStuck');
  assert.equal(topicOf('אני תקוע במשימה', 'he'), 'taskStuck');
  assert.equal(topicOf('צריך רמז', 'he'), 'taskStuck');
  assert.equal(topicOf('לא נוצר סרטון', 'he'), 'videoMissing');
  assert.equal(topicOf('לא קיבלתי סרטון', 'he'), 'videoMissing');
});

test('field sheet — English phrasings route to their own topic', () => {
  assert.equal(topicOf('I got kicked out', 'en'), 'kickedOut');
  assert.equal(topicOf('the button does nothing', 'en'), 'buttonStuck');
  assert.equal(topicOf('I cant solve this', 'en'), 'taskStuck');
  assert.equal(topicOf('no video was created', 'en'), 'videoMissing');
});

test('existing topics are not stolen by the new keywords', () => {
  assert.equal(topicOf('לא מצליח להתחבר', 'he'), 'login');
  assert.equal(topicOf('הניקוד שלי לא נכון', 'he'), 'score');
  assert.equal(topicOf('אין חיבור אינטרנט', 'he'), 'connection');
  assert.equal(topicOf('איך לשחק', 'he'), 'howToPlay');
  assert.equal(topicOf('cannot login', 'en'), 'login');
  assert.equal(topicOf('my score is wrong', 'en'), 'score');
  assert.equal(topicOf('no internet connection', 'en'), 'connection');
});

test('nonsense and empty input still fall through', () => {
  assert.equal(matchTopic('', 'he'), null);
  assert.equal(matchTopic('   ', 'en'), null);
  assert.equal(matchTopic('qwertyuiop zxcvbnm', 'en'), null);
});
