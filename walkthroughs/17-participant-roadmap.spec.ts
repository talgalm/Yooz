import { test } from '@playwright/test';
import { showCaption, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Participant roadmap view and game navigation
 */
test('מפת הדרכים של המשתתף', async ({ page }) => {
  startNarration();

  // Navigate to activity
  await page.goto('/play/DEMO');
  await pause(page, 2000);

  await showCaption(page, 'המשתתף נכנס לפעילות דרך קישור או קוד QR');

  // Fill name and join
  await page.locator('input').first().fill('משתתף לדוגמה').catch(() => {});
  await pause(page, 500);
  await page.locator('button[type="submit"]').first().click().catch(() => {});
  await page.waitForURL('**/story/**', { timeout: 15000 }).catch(() => {});
  await pause(page, 2000);

  await showCaption(page, 'מפת הדרכים — כל כרטיס מייצג משחק או תחנה');
  await pause(page, 2000);

  await showCaption(page, 'הכרטיסים מסודרים לפי הסדר שהמנהל הגדיר');
  await pause(page, 1500);

  await showCaption(page, 'כל סוג פריט מסומן באייקון — טריוויה, סדר, פאזל, תחנות ועוד');
  await pause(page, 2000);

  await showCaption(page, 'לוחצים על כרטיס כדי להתחיל לשחק');

  // Click first item
  await page.locator('div[role="button"]').first().click().catch(() => {});
  await pause(page, 2000);

  await showCaption(page, 'המשחק נטען — אחרי סיום חוזרים למפה להמשיך לפריט הבא');
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
