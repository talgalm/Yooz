import { test } from '@playwright/test';
import { showCaption, highlightAndClick, highlightAndFill, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Participant joins an activity and starts playing
 */
test('כניסה לפעילות והתחלת משחק', async ({ page }) => {
  startNarration();

  // Navigate to the activity play page
  await page.goto('/play/DEMO');
  await pause(page, 2000);
  await showCaption(page, 'ברוכים הבאים! זהו מסך הכניסה לפעילות');

  // Fill participant name
  await highlightAndFill(
    page,
    'input[placeholder*="name"], input[placeholder*="שם"]',
    'משתתף לדוגמה',
    'מזינים את השם של המשתתף',
  );

  // Click join button
  await highlightAndClick(
    page,
    'button[type="submit"]',
    'לוחצים על כפתור ההתחברות',
  );

  // Wait for navigation to story page
  await page.waitForURL('**/story/**', { timeout: 15000 }).catch(() => {});
  await pause(page, 2000);

  await showCaption(page, 'נכנסתם בהצלחה לפעילות! זהו מסך מפת הדרכים');
  await pause(page, 2000);

  await showCaption(page, 'כאן רואים את כל המשחקים והתחנות בפעילות');
  await pause(page, 1500);

  // Click the first item card to start playing
  await page.locator('div[role="button"]').first().click().catch(() => {});
  await showCaption(page, 'לוחצים על כרטיס המשחק הראשון כדי להתחיל לשחק');
  await pause(page, 2000);

  await showCaption(page, 'המשחק נטען ואפשר להתחיל לשחק — בהצלחה!');
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
