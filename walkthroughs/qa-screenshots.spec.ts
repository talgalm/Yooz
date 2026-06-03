/**
 * QA June 2026 — "after" screenshots for the desktop UI pass.
 *
 * Reads the activity codes written by `qa-create-activities.mjs` and
 * captures each affected screen at a desktop viewport (1440x900) so we can
 * place "after" PNGs next to the "before" images from the QA PDF.
 *
 * Run with:
 *   node walkthroughs/qa-create-activities.mjs   # idempotent
 *   npx playwright test walkthroughs/qa-screenshots.spec.ts --project=walkthroughs --workers=1
 *
 * Output: walkthroughs/qa-after/*.png
 */

import { test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve(__dirname, 'qa-after');
fs.mkdirSync(OUT_DIR, { recursive: true });

interface QaTarget {
  key: string;
  label: string;
  code: string;
}

const TARGETS: QaTarget[] = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'qa-activities.json'), 'utf-8')
);

const DESKTOP = { width: 1440, height: 900 } as const;

/** Join an activity as a participant and dismiss the guidelines popup so the
 *  underlying station/game is captured cleanly. */
async function joinAndOpen(page: Page, code: string) {
  await page.setViewportSize(DESKTOP);
  await page.goto(`/play/${code}`);
  const nameInput = page.locator('input').first();
  await nameInput.waitFor({ state: 'visible', timeout: 15_000 });
  await nameInput.fill('QA Reviewer');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL('**/story/**', { timeout: 15_000 });
  // Single-item activities go straight into the playing phase; a guidelines
  // popup is overlaid on top. Click "התחילו עכשיו" or the close X to dismiss.
  await page.waitForTimeout(1500);
  const startNow = page.getByRole('button', { name: /התחילו עכשיו/i }).first();
  if (await startNow.isVisible().catch(() => false)) {
    await startNow.click();
    await page.waitForTimeout(800);
  } else {
    const closeBtn = page.getByRole('button', { name: /Close/i }).first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    }
  }
}

async function shoot(page: Page, name: string) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`saved ${file}`);
}

test.describe.configure({ mode: 'serial' });

test('01 video station — QA #1 (enlarge + center)', async ({ page }) => {
  const t = TARGETS.find((x) => x.key === 'video')!;
  await joinAndOpen(page, t.code);
  await page.waitForTimeout(1200);
  await shoot(page, '01-video');
});

test('02 text/narrative station — QA #2 (enlarge bubble)', async ({ page }) => {
  const t = TARGETS.find((x) => x.key === 'text')!;
  await joinAndOpen(page, t.code);
  await page.waitForTimeout(800);
  await shoot(page, '02-text');
});

test('03 collage intro — QA #3-#4 (responsive + circles)', async ({ page }) => {
  const t = TARGETS.find((x) => x.key === 'collage')!;
  await joinAndOpen(page, t.code);
  await page.waitForTimeout(1200);
  await shoot(page, '03-collage-intro');
  // Step into capture phase for QA #5.
  const startCapture = page.getByRole('button', { name: /מתחילים/ }).first();
  if (await startCapture.isVisible().catch(() => false)) {
    await startCapture.click();
    await page.waitForTimeout(1500);
    await shoot(page, '05-collage-capture');
  }
});

test('07 image station — QA #7 enlarge + #8 modal backdrop', async ({ page }) => {
  const t = TARGETS.find((x) => x.key === 'image')!;
  await joinAndOpen(page, t.code);
  await page.waitForTimeout(800);
  await shoot(page, '07-image-station');
  // Open the fullscreen modal.
  const img = page.locator('img[alt=""]').first();
  if (await img.isVisible().catch(() => false)) {
    await img.click();
    await page.waitForTimeout(500);
    await shoot(page, '08-image-modal');
  }
});

test('11 ball-drop game — QA #11 dimensions', async ({ page }) => {
  const t = TARGETS.find((x) => x.key === 'ballGame')!;
  await joinAndOpen(page, t.code);
  // The phaser iframe shows a title screen with a "המשך" button inside the
  // iframe — click into it to surface the actual question + balls + buckets
  // scene that QA flagged for desktop dimensions.
  await page.waitForTimeout(3500);
  const iframe = page.frameLocator('iframe[title="Ball Game"]');
  const startBtn = iframe.getByRole('button').first();
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
    await page.waitForTimeout(3500);
  }
  await shoot(page, '11-ballgame');
});

test('12 trueFalse w/ image — QA #12 enlarge + zoom', async ({ page }) => {
  const t = TARGETS.find((x) => x.key === 'trueFalse')!;
  await joinAndOpen(page, t.code);
  await page.waitForTimeout(1000);
  // TrueFalse has its own intro/start. Click whichever start button shows up.
  const introBtn = page.getByRole('button').filter({ hasText: /התחל|בוא|המשך/ }).first();
  if (await introBtn.isVisible().catch(() => false)) {
    await introBtn.click();
    await page.waitForTimeout(4500); // countdown + first question
  }
  await shoot(page, '12-truefalse-image');
  // Click the statement image to open the zoom modal.
  const imgs = page.locator('img');
  const count = await imgs.count();
  for (let i = 0; i < count; i++) {
    const img = imgs.nth(i);
    const box = await img.boundingBox();
    if (box && box.width >= 100 && box.height >= 100) {
      await img.click();
      break;
    }
  }
  await page.waitForTimeout(700);
  await shoot(page, '12-truefalse-image-modal');
});

test('17 riddle station — QA #16 shadow + #17 layout', async ({ page }) => {
  const t = TARGETS.find((x) => x.key === 'riddle')!;
  await joinAndOpen(page, t.code);
  await page.waitForTimeout(1200);
  await shoot(page, '17-riddle');
});

test('20 avatar station — QA #20 buttons + figure', async ({ page }) => {
  const t = TARGETS.find((x) => x.key === 'avatar')!;
  await joinAndOpen(page, t.code);
  await page.waitForTimeout(1500);
  await shoot(page, '20-avatar');
});

test('15 admin avatar label — QA #15 typo fix', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/admin/login');
  await page.locator('input[type="email"]').fill('admin@yooz.com');
  await page.locator('input[type="password"]').fill('admin123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await page.getByRole('button', { name: /Stations|תחנות/i }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  await shoot(page, '15-avatar-typo-stations-tab');
});
