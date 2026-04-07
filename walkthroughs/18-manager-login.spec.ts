import { test } from '@playwright/test';
import { showCaption, highlightAndClick, highlightAndFill, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Manager login and dashboard
 */
test('כניסת מנהל פעילות', async ({ page }) => {
  startNarration();

  await page.goto('/manager');
  await pause(page, 1500);

  await showCaption(page, 'מסך ההתחברות למנהל פעילות');

  await highlightAndFill(
    page,
    'input[placeholder*="code"], input[placeholder*="קוד"]',
    'DEMO123',
    'מזינים את קוד הפעילות',
  );

  await highlightAndFill(
    page,
    'input[type="email"]',
    'manager@yooz.com',
    'מזינים אימייל מנהל',
  );

  await highlightAndFill(
    page,
    'input[type="password"]',
    'manager123',
    'מזינים סיסמה',
  );

  await highlightAndClick(
    page,
    'button[type="submit"]',
    'לוחצים התחברות',
  );

  await page.waitForURL('**/manager/**', { timeout: 10000 }).catch(() => {});
  await pause(page, 2000);

  await showCaption(page, 'לוח הבקרה של המנהל — צפייה בנתוני הפעילות בזמן אמת');
  await pause(page, 2000);

  await showCaption(page, 'רואים את רשימת המשתתפים, ציונים ולוח תוצאות');
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
