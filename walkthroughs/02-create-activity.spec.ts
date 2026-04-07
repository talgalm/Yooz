import { test } from '@playwright/test';
import { showCaption, highlightAndFill, pause, startNarration, saveNarrationLog } from './helpers';

/**
 * Walkthrough: Creating a New Activity
 */
test('Create Activity Walkthrough', async ({ page }) => {
  startNarration();

  // --- Login (no narration, fast) ---
  await page.goto('/admin/login');
  await page.fill('input[type="email"], input[placeholder*="email" i]', 'admin@yooz.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {});
  await pause(page, 1000);

  // --- Click Create Activity ---
  await showCaption(page, 'לוחצים על צור פעילות', 2000);
  await page.click(':text("Create Activity"), :text("צור פעילות")').catch(() => {});
  await page.waitForURL('**/activities/new', { timeout: 10000 }).catch(() => {
    return page.goto('/admin/activities/new');
  });
  await pause(page, 1000);

  // --- Enter activity name ---
  await highlightAndFill(
    page,
    'input[placeholder*="Activity Name"], input[placeholder*="שם הפעילות"]',
    'הרפתקה בטבע',
    'נותנים שם לפעילות',
  );

  // --- One line about settings ---
  await showCaption(page, 'אפשר להגדיר את הגדרות הפעילות כרצונכם — סוג מודול, שדות כניסה, ערכת נושא ועוד', 3500);

  // --- Go to Step 2 ---
  await showCaption(page, 'עוברים לשלב 2 — בחירת משחקים ותחנות', 2500);
  await page.click('button:has-text("Select Games"), button:has-text("בחירת משחקים")').catch(async () => {
    await page.click('button:has-text("Next"), button:has-text("הבא")').catch(() => {});
  });
  await pause(page, 1500);

  // --- Select 6 games/stations one by one ---
  await showCaption(page, 'בוחרים משחקים ותחנות — לוחצים על הכרטיסים', 2500);

  // The Card components have emojis as icons — click cards containing game/station emojis
  const emojis = ['❓', '🔢', '🧩', '✅', '🏀', '📝', '🎬', '🖼️', '📖', '🏅'];
  let picked = 0;
  for (const emoji of emojis) {
    if (picked >= 6) break;
    const card = page.locator(`div:has(> div > span:text-is("${emoji}"))`).first();
    const visible = await card.isVisible({ timeout: 500 }).catch(() => false);
    if (visible) {
      await card.click();
      picked++;
      await pause(page, 1000);
    }
  }

  // Fallback if emoji selectors didn't match
  if (picked < 3) {
    await page.click('button:has-text("Games"), button:has-text("משחקים")').catch(() => {});
    await pause(page, 500);
    // Try clicking visible card-like elements in the scrollable grid
    for (let i = picked; i < 6; i++) {
      const nthCard = page.locator('div[class*="css"]').filter({ hasText: /trivia|order|puzzle|trueFalse|ballGame|text|video|image|narrative/ }).nth(i - picked);
      const clicked = await nthCard.click({ timeout: 1000 }).then(() => true).catch(() => false);
      if (!clicked) break;
      picked++;
      await pause(page, 1000);
    }
  }

  await showCaption(page, 'כל פריט שנבחר מתווסף לרשימה למטה', 2500);

  // Scroll to show selected items
  await page.evaluate(() => window.scrollBy(0, 400));
  await pause(page, 1500);

  await showCaption(page, 'אפשר לגרור כדי לשנות סדר', 2000);

  // --- Save ---
  await showCaption(page, 'לוחצים על צור פעילות לשמירה', 2000);
  // Click submit — this will navigate to activity detail page
  await page.click('button[type="submit"]');

  // Wait for navigation to the activity detail page
  await page.waitForURL('**/admin/activities/**', { timeout: 15000 }).catch(() => {});
  await pause(page, 1500);

  await showCaption(page, 'הפעילות נוצרה בהצלחה! זה עמוד הפעילות', 3000);
  await pause(page, 2000);

  // Save narration log
  saveNarrationLog('walkthrough-videos/02-create-activity-narration.json');
});
