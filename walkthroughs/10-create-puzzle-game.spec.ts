import { test } from '@playwright/test';
import { showCaption, highlightAndClick, highlightAndFill, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Creating a new Puzzle game
 */
test('יצירת משחק פאזל חדש', async ({ page }) => {
  startNarration();

  // Login (fast)
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@yooz.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 1000);

  await page.goto('/admin/games/new');
  await pause(page, 1500);

  await showCaption(page, 'ניצור משחק פאזל — המשתתפים יענו על שאלות כדי לחשוף תמונה');

  await highlightAndFill(
    page,
    'input[placeholder*="Game Name"], input[placeholder*="שם המשחק"]',
    'פאזל הטבע',
    'נותנים שם למשחק',
  );

  await highlightAndClick(
    page,
    'button:has-text("Puzzle"), button:has-text("פאזל")',
    'בוחרים סוג משחק — פאזל',
  );
  await pause(page, 1000);

  await showCaption(page, 'ממלאים נתוני דוגמה');
  await page.locator('button:has-text("🎲")').first().click().catch(() => {});
  await pause(page, 2000);

  await page.evaluate(() => window.scrollBy(0, 400));
  await pause(page, 1500);

  await showCaption(page, 'מגדירים תמונת פאזל, שאלות ומספר חלקים');
  await pause(page, 2000);

  await showCaption(page, 'שומרים את המשחק');
  await page.locator('button[type="submit"]').first().click().catch(() => {});
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
