import { test } from '@playwright/test';
import { showCaption, highlightAndClick, highlightAndFill, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Creating stations (text, video, image)
 */
test('יצירת תחנות — טקסט, וידאו ותמונה', async ({ page }) => {
  startNarration();

  // Login (fast)
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@yooz.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 1000);

  // Navigate to create station
  await page.goto('/admin/stations/new');
  await pause(page, 1500);

  await showCaption(page, 'ניצור תחנה חדשה — תחנות הן תוכן שהמשתתף רואה בין המשחקים');

  // Fill station name
  await highlightAndFill(
    page,
    'input[placeholder*="Station Name"], input[placeholder*="שם התחנה"]',
    'ברוכים הבאים להרפתקה',
    'נותנים שם לתחנה',
  );

  // Show station types
  await showCaption(page, 'בוחרים סוג תחנה — טקסט, וידאו, תמונה, קולאז׳ או משוב');
  await pause(page, 1500);

  // Select Text type
  await highlightAndClick(
    page,
    'button:has-text("Text"), button:has-text("טקסט")',
    'בוחרים תחנת טקסט — להצגת מידע כתוב',
  );
  await pause(page, 1000);

  await page.evaluate(() => window.scrollBy(0, 300));
  await pause(page, 1000);

  await showCaption(page, 'ממלאים את תוכן התחנה — הטקסט שהמשתתף יראה');
  await pause(page, 2000);

  await showCaption(page, 'אפשר גם לבחור תחנת וידאו או תמונה עם קישור למדיה');
  await pause(page, 2000);

  // Save
  await showCaption(page, 'שומרים את התחנה');
  await page.locator('button[type="submit"]').first().click().catch(() => {});
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
