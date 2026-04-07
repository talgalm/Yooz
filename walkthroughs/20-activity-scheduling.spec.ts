import { test } from '@playwright/test';
import { showCaption, highlightAndClick, highlightAndFill, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Setting up activity scheduling (start/end dates)
 */
test('תזמון פעילות — הגדרת תאריכי פתיחה וסגירה', async ({ page }) => {
  startNarration();

  // Login (fast)
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@yooz.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 1000);

  // Go to create activity
  await page.goto('/admin/activities/new');
  await pause(page, 1500);

  await showCaption(page, 'ניצור פעילות עם תזמון — הגדרת תאריכי פתיחה וסגירה');

  await highlightAndFill(
    page,
    'input[placeholder*="Activity Name"], input[placeholder*="שם הפעילות"]',
    'פעילות מתוזמנת',
    'נותנים שם לפעילות',
  );

  // Scroll to scheduling section
  await page.evaluate(() => window.scrollBy(0, 500));
  await pause(page, 1500);

  await showCaption(page, 'בברירת מחדל הפעילות תמיד פתוחה');
  await pause(page, 1500);

  // Uncheck "Always open"
  await page.locator('input[type="checkbox"]').last().click().catch(() => {});
  await pause(page, 1000);

  await showCaption(page, 'מבטלים את הסימון כדי להגדיר תאריכים');
  await pause(page, 1500);

  await showCaption(page, 'מגדירים תאריך ושעת פתיחה — לפני הזמן המשתתפים יראו ספירה לאחור');
  await pause(page, 2000);

  await showCaption(page, 'ותאריך סגירה — אחרי הזמן הפעילות תסתיים');
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
