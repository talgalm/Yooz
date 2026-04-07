import { test } from '@playwright/test';
import { showCaption, highlightAndClick, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Exporting a game from the Content Library
 */
test('Export From Library Walkthrough', async ({ page }) => {
  startNarration();

  // --- Login (fast, no narration) ---
  await page.goto('/admin/login');
  await page.fill('input[type="email"], input[placeholder*="email" i]', 'admin@yooz.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 1000);

  // --- Click Library tab ---
  await showCaption(page, 'בשביל לשחזר פעילות מ-Yooz הישן — נכנסים ללשונית ספרייה', 3500);
  await page.click(':text("Library"), :text("ספרייה")').catch(() => {});
  await pause(page, 2000);

  // --- Show library content ---
  await showCaption(page, 'כאן רואים את כל התוכן שיובא — משחקים ותחנות', 3000);
  await pause(page, 1000);

  // --- Filter to Games only ---
  // Click the "Games" / "משחקים" segmented button inside the library section
  await page.locator('button:has-text("Games"), button:has-text("משחקים")').last().click().catch(() => {});
  await pause(page, 1500);

  await showCaption(page, 'מסננים לפי משחקים — בוחרים משחק ולוחצים על ייצוא', 3000);

  // Click the first Export button on a game row
  const exportBtn = page.locator('button:has-text("Export"), button:has-text("ייצוא")').first();
  await exportBtn.scrollIntoViewIfNeeded().catch(() => {});
  await exportBtn.click().catch(() => {});

  // Export navigates to /admin/games/new?type=...
  await page.waitForURL('**/admin/games/new**', { timeout: 10000 });
  await pause(page, 1500);

  // --- Show the prefilled game config page ---
  await showCaption(page, 'המשחק נפתח בעמוד יצירה חדש — כל הנתונים כבר מלאים מהספרייה', 3500);
  await pause(page, 1500);

  // Scroll down to show the content
  await page.evaluate(() => window.scrollBy(0, 300));
  await pause(page, 1500);

  await showCaption(page, 'אפשר לערוך את השם או ההגדרות לפני השמירה', 2500);
  await pause(page, 1000);

  // --- Save ---
  await showCaption(page, 'לוחצים שמירה — והמשחק נוסף למערכת', 2500);
  await page.click('button[type="submit"]');

  // After save, navigates back to dashboard
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 1500);

  await showCaption(page, 'המשחק נשמר בהצלחה! עכשיו אפשר להוסיף אותו לפעילות', 3000);
  await pause(page, 2000);

  // Save narration log
  saveNarrationLog('walkthrough-videos/03-export-library-narration.json');
});
