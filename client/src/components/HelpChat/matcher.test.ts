import test from 'node:test';
import assert from 'node:assert/strict';
import { matchTopic } from './matcher';

/**
 * The risk when adding topics to this file is keyword collision: a new phrase
 * hijacking an existing topic, or an existing one shadowing the new sheet.
 * These are the sentences from the field troubleshooting sheet plus the
 * neighbours most likely to be stolen from.
 */

function topicOf(input: string) {
  return matchTopic(input)?.topicId ?? null;
}

test('field sheet — Hebrew phrasings route to their own topic', () => {
  assert.equal(topicOf('נזרקתי מהפעילות'), 'kickedOut');
  assert.equal(topicOf('אין לי קישור לפעילות'), 'kickedOut');
  assert.equal(topicOf('הכפתור לא עובד'), 'buttonStuck');
  assert.equal(topicOf('אני תקוע במשימה'), 'taskStuck');
  assert.equal(topicOf('צריך רמז'), 'taskStuck');
  assert.equal(topicOf('לא נוצר סרטון'), 'videoMissing');
  assert.equal(topicOf('לא קיבלתי סרטון'), 'videoMissing');
});

test('field sheet — English phrasings route to their own topic', () => {
  assert.equal(topicOf('I got kicked out'), 'kickedOut');
  assert.equal(topicOf('the button does nothing'), 'buttonStuck');
  assert.equal(topicOf('I cant solve this'), 'taskStuck');
  assert.equal(topicOf('no video was created'), 'videoMissing');
});

test('existing topics are not stolen by the new keywords', () => {
  assert.equal(topicOf('לא מצליח להתחבר'), 'login');
  assert.equal(topicOf('הניקוד שלי לא נכון'), 'score');
  assert.equal(topicOf('אין חיבור אינטרנט'), 'connection');
  assert.equal(topicOf('איך לשחק'), 'howToPlay');
  assert.equal(topicOf('cannot login'), 'login');
  assert.equal(topicOf('my score is wrong'), 'score');
  assert.equal(topicOf('no internet connection'), 'connection');
});

test('nonsense and empty input still fall through', () => {
  assert.equal(matchTopic(''), null);
  assert.equal(matchTopic('   '), null);
  assert.equal(matchTopic('qwertyuiop zxcvbnm'), null);
});
