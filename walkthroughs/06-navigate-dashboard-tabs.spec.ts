import { test } from '@playwright/test';
import { showCaption, highlightAndClick, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Navigating the admin dashboard tabs
 */
test('סיור בלשוניות לוח הבקרה', async ({ page }) => {
  startNarration();

  // Login (fast)
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@yooz.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 1500);

  await showCaption(page, 'ברוכים הבאים ללוח הבקרה — כאן מנהלים את כל המערכת');

  // Activities tab (default)
  await showCaption(page, 'לשונית פעילויות — כאן רואים את כל הפעילויות שיצרתם');
  await pause(page, 1500);

  // Stations tab
  await highlightAndClick(
    page,
    'button:has-text("Stations"), button:has-text("תחנות")',
    'לשונית תחנות — ניהול משחקים, תחנות ומשימות',
  );
  await pause(page, 1500);

  // Library tab
  await highlightAndClick(
    page,
    'button:has-text("Library"), button:has-text("ספרייה")',
    'לשונית ספרייה — ייבוא תוכן מהמערכת הישנה',
  );
  await pause(page, 1500);

  // Statistics tab
  await highlightAndClick(
    page,
    'button:has-text("Statistics"), button:has-text("דוחות")',
    'לשונית דוחות — סטטיסטיקות ואנליטיקות',
  );
  await pause(page, 1500);

  // Users tab
  await highlightAndClick(
    page,
    'button:has-text("Users"), button:has-text("משתמשים")',
    'לשונית משתמשים — ניהול הרשאות ומשתמשים',
  );
  await pause(page, 1500);

  // Portals tab
  await highlightAndClick(
    page,
    'button:has-text("Portals"), button:has-text("פורטלים")',
    'לשונית פורטלים — ניהול גישת לקוחות',
  );
  await pause(page, 1500);

  // Tutorials tab
  await highlightAndClick(
    page,
    'button:has-text("Tutorials"), button:has-text("סרטוני הדרכה")',
    'לשונית סרטוני הדרכה — יצירת סרטוני הדרכה אוטומטיים',
  );
  await pause(page, 2000);

  await showCaption(page, 'ככה מנווטים בין כל החלקים של המערכת!');
  await pause(page, 2000);

  saveNarrationLog('NARRATION_OUTPUT_PATH');
});
