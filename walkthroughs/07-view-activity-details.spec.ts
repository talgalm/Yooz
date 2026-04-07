import { test } from '@playwright/test';
import { showCaption, highlightAndClick, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Viewing activity details, QR code, and toggling status
 */
test('צפייה בפרטי פעילות וקוד QR', async ({ page }) => {
  startNarration();

  // Login (fast)
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@yooz.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 1500);

  await showCaption(page, 'בוחרים פעילות מהרשימה כדי לראות את הפרטים שלה');

  // Click first activity row
  await page.locator('tr').nth(1).click().catch(() => {});
  await page.waitForURL('**/admin/activities/**', { timeout: 10000 }).catch(() => {});
  await pause(page, 2000);

  await showCaption(page, 'זהו עמוד הפעילות — כאן רואים את כל הפרטים');
  await pause(page, 2000);

  await showCaption(page, 'קוד QR להפצה — המשתתפים סורקים ומצטרפים');
  await pause(page, 2000);

  await showCaption(page, 'אפשר לשנות סטטוס בין תצוגה מקדימה לפעיל');
  await pause(page, 1500);

  // Click edit button if visible
  await page.locator('button:has-text("Edit"), button:has-text("עריכה")').first().click().catch(() => {});
  await page.waitForURL('**/edit', { timeout: 5000 }).catch(() => {});
  await pause(page, 1500);

  await showCaption(page, 'מכאן אפשר לערוך את ההגדרות ולשנות משחקים');
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
