import { test } from '@playwright/test';
import { showCaption, highlightAndClick, highlightAndFill, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Creating a new Mission
 */
test('יצירת משימה חדשה', async ({ page }) => {
  startNarration();

  // Login (fast)
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@yooz.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 1000);

  // Navigate to Stations → Missions
  await page.click('button:has-text("Stations"), button:has-text("תחנות")').catch(() => {});
  await pause(page, 500);
  await page.click('button:has-text("Missions"), button:has-text("משימות")').catch(() => {});
  await pause(page, 1000);

  // Create new mission
  await page.locator('button:has-text("Create"), button:has-text("צור")').first().click().catch(() => {
    return page.goto('/admin/missions/new');
  });
  await page.waitForURL('**/admin/missions/new**', { timeout: 10000 }).catch(() => {});
  await pause(page, 1500);

  await showCaption(page, 'ניצור משימה — חוויה עם מסכי הסבר, משחק ותג הישג');

  // Fill mission name
  await highlightAndFill(
    page,
    'input[placeholder*="name"], input[placeholder*="שם"]',
    'משימת החקירה',
    'נותנים שם למשימה',
  );

  await page.evaluate(() => window.scrollBy(0, 300));
  await pause(page, 1500);

  await showCaption(page, 'מגדירים מסכי הסבר — כל מסך כולל כותרת, תיאור ותמונת רקע');
  await pause(page, 2000);

  await showCaption(page, 'בסוף המשימה המשתתף מקבל תג הישג');
  await pause(page, 2000);

  await showCaption(page, 'שומרים את המשימה');
  await page.locator('button[type="submit"]').first().click().catch(() => {});
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
