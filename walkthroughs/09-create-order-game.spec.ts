import { test } from '@playwright/test';
import { showCaption, highlightAndClick, highlightAndFill, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Creating a new Order game
 */
test('יצירת משחק סדר חדש', async ({ page }) => {
  startNarration();

  // Login (fast)
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@yooz.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 1000);

  // Navigate directly to create game
  await page.goto('/admin/games/new');
  await pause(page, 1500);

  await showCaption(page, 'ניצור משחק סדר — המשתתפים יסדרו פריטים בסדר הנכון');

  // Fill game name
  await highlightAndFill(
    page,
    'input[placeholder*="Game Name"], input[placeholder*="שם המשחק"]',
    'סדר אירועים היסטוריים',
    'נותנים שם למשחק',
  );

  // Select Order type
  await highlightAndClick(
    page,
    'button:has-text("Order"), button:has-text("סדר")',
    'בוחרים סוג משחק — סדר',
  );
  await pause(page, 1000);

  // Use random data
  await showCaption(page, 'ממלאים נתוני דוגמה עם כפתור הקוביה');
  await page.locator('button:has-text("🎲")').first().click().catch(() => {});
  await pause(page, 2000);

  await page.evaluate(() => window.scrollBy(0, 300));
  await pause(page, 1000);

  await showCaption(page, 'הפריטים נוצרו — אפשר לגרור כדי לשנות את הסדר הנכון');
  await pause(page, 2000);

  // Save
  await showCaption(page, 'שומרים את המשחק');
  await page.locator('button[type="submit"]').first().click().catch(() => {});
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
