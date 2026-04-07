import { test } from '@playwright/test';
import { showCaption, highlightAndClick, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Landing page and navigation options
 */
test('עמוד הנחיתה וניווט', async ({ page }) => {
  startNarration();

  await page.goto('/');
  await pause(page, 2000);

  await showCaption(page, 'ברוכים הבאים לעמוד הנחיתה של Yooz');
  await pause(page, 2000);

  await showCaption(page, 'כאן רואים סקירה של המערכת ותכונות עיקריות');
  await pause(page, 2000);

  // Scroll to show features
  await page.evaluate(() => window.scrollBy(0, 400));
  await pause(page, 1500);

  await showCaption(page, 'למטה יש כפתורי כניסה — מנהל ראשי או מנהל פעילות');
  await pause(page, 2000);

  // Click admin login
  await page.locator('button:has-text("כניסה למנהל"), a:has-text("כניסה למנהל")').first().click().catch(() => {});
  await page.waitForURL('**/admin/login', { timeout: 5000 }).catch(() => {});
  await pause(page, 1500);

  await showCaption(page, 'הגענו למסך ההתחברות של המנהל');
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
