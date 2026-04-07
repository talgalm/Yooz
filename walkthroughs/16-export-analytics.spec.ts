import { test } from '@playwright/test';
import { showCaption, highlightAndClick, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Exporting analytics data to Excel
 */
test('ייצוא נתונים לאקסל', async ({ page }) => {
  startNarration();

  // Login (fast)
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@yooz.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 1000);

  // Navigate to Statistics tab
  await highlightAndClick(
    page,
    'button:has-text("Statistics"), button:has-text("דוחות")',
    'נכנסים ללשונית דוחות',
  );
  await pause(page, 2000);

  await showCaption(page, 'בוחרים פעילות כדי לראות נתונים מפורטים');

  // Click first activity
  await page.locator('tr').nth(1).click().catch(() => {});
  await pause(page, 2000);

  await showCaption(page, 'כאן רואים סטטיסטיקות — ציונים, משפך השלמה, ונתוני פריטים');
  await pause(page, 2000);

  // Click export button
  await showCaption(page, 'לוחצים על ייצוא כדי להוריד קובץ אקסל');
  await page.locator('button:has-text("Export"), button:has-text("ייצוא")').first().click().catch(() => {});
  await pause(page, 2000);

  await showCaption(page, 'הקובץ מוריד עם כל הנתונים — משתתפים, ציונים והתקדמות');
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
