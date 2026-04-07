import { test } from '@playwright/test';
import { showCaption, highlightAndClick, highlightAndFill, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Admin Login Flow
 */
test('Admin Login Walkthrough', async ({ page }) => {
  startNarration();

  await page.goto('/admin/login');
  await pause(page, 1500);
  await showCaption(page, 'ברוכים הבאים למערכת הניהול של Yooz');

  await highlightAndFill(
    page,
    'input[type="email"], input[placeholder*="email" i], input[placeholder*="אימייל"]',
    'admin@yooz.com',
    'הזינו את כתובת האימייל שלכם',
  );

  await highlightAndFill(
    page,
    'input[type="password"]',
    'admin123',
    'הזינו את הסיסמה',
  );

  await highlightAndClick(
    page,
    'button[type="submit"]',
    'לחצו על כפתור ההתחברות',
  );

  // Wait for navigation after login
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 2000);
  await showCaption(page, 'נכנסתם בהצלחה ללוח הבקרה');
  await pause(page, 2000);

  // Save narration timestamps for voice post-processing
  saveNarrationLog('walkthrough-videos/01-admin-login-narration.json');
});
