import { test } from '@playwright/test';
import { showCaption, highlightAndClick, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Toggling activity status between Preview and Live
 */
test('שינוי סטטוס פעילות — תצוגה מקדימה לפעיל', async ({ page }) => {
  startNarration();

  // Login (fast)
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@yooz.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 1500);

  await showCaption(page, 'בוחרים פעילות מהרשימה');

  // Click first activity
  await page.locator('tr').nth(1).click().catch(() => {});
  await page.waitForURL('**/admin/activities/**', { timeout: 10000 }).catch(() => {});
  await pause(page, 2000);

  await showCaption(page, 'בעמוד הפעילות רואים את הסטטוס הנוכחי');
  await pause(page, 2000);

  await showCaption(page, 'תצוגה מקדימה — רק לבדיקות. פעיל — פתוח למשתתפים');
  await pause(page, 2000);

  // Click status toggle
  await page.locator('button:has-text("Live"), button:has-text("Preview"), button:has-text("פעיל"), button:has-text("תצוגה מקדימה")').first().click().catch(() => {});
  await pause(page, 1500);

  await showCaption(page, 'הסטטוס השתנה! עכשיו הפעילות פעילה ונגישה למשתתפים');
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
