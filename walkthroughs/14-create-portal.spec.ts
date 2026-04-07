import { test } from '@playwright/test';
import { showCaption, highlightAndClick, highlightAndFill, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Creating a portal for client access
 */
test('יצירת פורטל גישה ללקוח', async ({ page }) => {
  startNarration();

  // Login (fast)
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@yooz.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 1000);

  // Navigate to Portals tab
  await highlightAndClick(
    page,
    'button:has-text("Portals"), button:has-text("פורטלים")',
    'נכנסים ללשונית פורטלים',
  );
  await pause(page, 1000);

  // Create new portal
  await page.locator('button:has-text("Create"), button:has-text("צור")').first().click().catch(() => {
    return page.goto('/admin/portals/new');
  });
  await page.waitForURL('**/admin/portals/new**', { timeout: 10000 }).catch(() => {});
  await pause(page, 1500);

  await showCaption(page, 'פורטל מאפשר ללקוח לצפות בתוצאות הפעילות שלו');

  // Fill portal fields
  await page.locator('input').first().fill('פורטל לקוח דוגמה').catch(() => {});
  await showCaption(page, 'נותנים שם לפורטל ומגדירים פרטי גישה');
  await pause(page, 2000);

  await page.evaluate(() => window.scrollBy(0, 300));
  await pause(page, 1500);

  await showCaption(page, 'מוסיפים משתמשים עם אימייל וסיסמה — הם יכנסו דרך קישור הפורטל');
  await pause(page, 2000);

  await showCaption(page, 'שומרים את הפורטל');
  await page.locator('button[type="submit"]').first().click().catch(() => {});
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
