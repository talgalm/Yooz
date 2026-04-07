import { test } from '@playwright/test';
import { showCaption, highlightAndClick, highlightAndFill, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Creating a new Trivia game
 */
test('יצירת משחק טריוויה חדש', async ({ page }) => {
  startNarration();

  // Login (fast)
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@yooz.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 1000);

  // Navigate to Stations → Games
  await highlightAndClick(
    page,
    'button:has-text("Stations"), button:has-text("תחנות")',
    'נכנסים ללשונית תחנות',
  );
  await pause(page, 500);

  await highlightAndClick(
    page,
    'button:has-text("Games"), button:has-text("משחקים")',
    'בוחרים את תת-הלשונית משחקים',
  );
  await pause(page, 1000);

  // Click create new game
  await page.locator('button:has-text("Create"), button:has-text("צור")').first().click().catch(() => {
    return page.goto('/admin/games/new');
  });
  await page.waitForURL('**/admin/games/new**', { timeout: 10000 }).catch(() => {});
  await pause(page, 1500);

  await showCaption(page, 'ניצור משחק טריוויה חדש');

  // Fill game name
  await highlightAndFill(
    page,
    'input[placeholder*="Game Name"], input[placeholder*="שם המשחק"]',
    'חידון ידע כללי',
    'נותנים שם למשחק',
  );

  // Select Trivia type
  await highlightAndClick(
    page,
    'button:has-text("Trivia"), button:has-text("טריוויה")',
    'בוחרים את סוג המשחק — טריוויה',
  );
  await pause(page, 1000);

  // Use random test data button
  await showCaption(page, 'אפשר למלא נתוני דוגמה אוטומטית בלחיצה על הקוביה');
  await page.locator('button:has-text("🎲")').first().click().catch(() => {});
  await pause(page, 2000);

  // Scroll to show questions
  await page.evaluate(() => window.scrollBy(0, 400));
  await pause(page, 1500);

  await showCaption(page, 'השאלות נוצרו אוטומטית — אפשר לערוך כל שאלה');
  await pause(page, 2000);

  // Save
  await showCaption(page, 'לוחצים שמירה — והמשחק מוכן');
  await page.locator('button[type="submit"]').first().click().catch(() => {});
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 2000);

  await showCaption(page, 'המשחק נוצר בהצלחה!');
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
