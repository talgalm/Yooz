import { test } from '@playwright/test';
import { showCaption, highlightAndClick, highlightAndFill, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Searching for games, stations and activities
 */
test('חיפוש תוכן במערכת', async ({ page }) => {
  startNarration();

  // Login (fast)
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@yooz.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 1500);

  await showCaption(page, 'אפשר לחפש תוכן בכל לשוניות הדשבורד');

  // Search in activities
  await highlightAndFill(
    page,
    'input[placeholder*="Search"], input[placeholder*="חיפוש"]',
    'הרפתקה',
    'מקלידים מילת חיפוש — התוצאות מתעדכנות בזמן אמת',
  );
  await pause(page, 2000);

  await showCaption(page, 'הרשימה מסוננת לפי מילת החיפוש');
  await pause(page, 1500);

  // Clear and switch to stations tab
  await page.locator('input[placeholder*="Search"], input[placeholder*="חיפוש"]').first().fill('').catch(() => {});
  await pause(page, 500);

  await highlightAndClick(
    page,
    'button:has-text("Stations"), button:has-text("תחנות")',
    'אפשר לחפש גם בלשונית תחנות',
  );
  await pause(page, 1500);

  await showCaption(page, 'החיפוש עובד בכל מקום — פעילויות, משחקים, תחנות וספרייה');
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
