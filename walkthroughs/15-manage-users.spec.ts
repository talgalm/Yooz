import { test } from '@playwright/test';
import { showCaption, highlightAndClick, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Managing admin users
 */
test('ניהול משתמשים במערכת', async ({ page }) => {
  startNarration();

  // Login (fast)
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@yooz.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 1000);

  // Navigate to Users tab
  await highlightAndClick(
    page,
    'button:has-text("Users"), button:has-text("משתמשים")',
    'נכנסים ללשונית משתמשים',
  );
  await pause(page, 2000);

  await showCaption(page, 'כאן מנהלים את כל המשתמשים במערכת');
  await pause(page, 2000);

  await showCaption(page, 'אפשר להוסיף משתמשים חדשים, לערוך הרשאות ולמחוק');
  await pause(page, 2000);

  await showCaption(page, 'לכל משתמש יש תפקיד — מנהל ראשי או מנהל רגיל');
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
