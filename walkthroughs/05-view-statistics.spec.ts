import { test } from '@playwright/test';
import { showCaption, highlightAndClick, highlightAndFill, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Viewing activity statistics and analytics
 */
test('צפייה בסטטיסטיקות פעילות', async ({ page }) => {
  startNarration();

  // Admin login
  await page.goto('/admin/login');
  await pause(page, 1500);
  await showCaption(page, 'נתחיל בכניסה למערכת הניהול');

  await highlightAndFill(
    page,
    'input[type="email"]',
    'admin@yooz.com',
    'הזינו את כתובת האימייל',
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

  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 2000);

  // Navigate to Statistics tab
  await highlightAndClick(
    page,
    'button:has-text("Statistics"), button:has-text("דוחות")',
    'לוחצים על לשונית הדוחות',
  );
  await pause(page, 2000);

  await showCaption(page, 'כאן רואים סקירה כללית — משתתפים, השלמות, ציונים ומשך ממוצע');
  await pause(page, 2000);

  // Click on first activity for detailed stats
  await page.locator('tr').nth(1).click().catch(() => {});
  await showCaption(page, 'לוחצים על פעילות כדי לראות נתונים מפורטים');
  await pause(page, 2000);

  await showCaption(page, 'כאן רואים התפלגות ציונים, משפך השלמה ונתונים לפי פריט');
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
