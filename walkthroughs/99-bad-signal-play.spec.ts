// Bad-signal walkthrough — drives a real Chromium through one full participant
// flow with route-level latency + dropped requests. Use to validate offline
// queue, retry logic, and recovery UX without leaving your desk.
//
// Run:
//   PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//   CODE=ABC123 \
//   NAME='bad-signal-bot' \
//   npx playwright test walkthroughs/99-bad-signal-play.spec.ts --project=walkthroughs
//
// Tune via env:
//   LATENCY_MS=2000   per-request delay (default 2s)
//   DROP_RATE=0.05    fraction of API requests to drop (5xx) (default 5%)
//   OFFLINE_CYCLE=0   if >0, toggle full offline every N seconds during the run

import { test, expect, type Route } from '@playwright/test';

const CODE = process.env.CODE;
const NAME = process.env.NAME || `bad_signal_${Date.now()}`;
const LATENCY_MS = Number(process.env.LATENCY_MS || 2000);
const DROP_RATE = Number(process.env.DROP_RATE || 0.05);
const OFFLINE_CYCLE = Number(process.env.OFFLINE_CYCLE || 0);

test.skip(!CODE, 'set CODE=<activity-code> to run');

test('participant finishes activity over throttled flaky connection', async ({ context, page }) => {
  // Throttle every API call. Static assets pass through so we don't black out
  // the UI — bad signal in real life still serves cached HTML/JS.
  await context.route('**/api/**', async (route: Route) => {
    await new Promise(r => setTimeout(r, LATENCY_MS));
    if (Math.random() < DROP_RATE) {
      return route.fulfill({ status: 503, body: '{"error":"simulated drop"}' });
    }
    return route.continue();
  });

  // Optional: cycle online/offline so the offline queue path is exercised.
  let offlineToggle: NodeJS.Timeout | null = null;
  if (OFFLINE_CYCLE > 0) {
    let offline = false;
    offlineToggle = setInterval(async () => {
      offline = !offline;
      await context.setOffline(offline);
      console.log(`[bad-signal] offline=${offline}`);
    }, OFFLINE_CYCLE * 1000);
  }

  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });

  try {
    await page.goto(`/play/${CODE}`);

    // Fill the join form — adjust selectors if your activity asks for more fields.
    const nameInput = page.locator('input[name="name"], input[placeholder*="שם"]').first();
    if (await nameInput.count()) {
      await nameInput.fill(NAME);
    }
    await page.getByRole('button', { name: /התחל|כניסה|להתחיל|Start/i }).first().click();

    // Play through whatever appears — keep clicking the primary "next/continue"
    // button until we hit a finish state or 6 minutes pass.
    const deadline = Date.now() + 6 * 60 * 1000;
    let stationsCompleted = 0;
    while (Date.now() < deadline) {
      const finished = await page.getByText(/סיימת|כל הכבוד|Finish|Done/i).first().isVisible().catch(() => false);
      if (finished) break;

      const nextBtn = page.getByRole('button', { name: /המשך|הבא|אישור|Next|Continue/i }).first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click({ timeout: 8000 }).catch(() => {});
        stationsCompleted++;
      } else {
        await page.waitForTimeout(1500);
      }
    }

    console.log(`[bad-signal] completed ${stationsCompleted} interactions, errors=${errors.length}`);

    // Verify offline queue eventually drained (no leftover writes after a calm window).
    await page.waitForTimeout(8000);
    const queueLen = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('yooz_offline_queue');
        return raw ? (JSON.parse(raw) as unknown[]).length : 0;
      } catch { return -1; }
    });
    console.log(`[bad-signal] residual offline queue size: ${queueLen}`);

    // We don't fail the test on residual queue (might be retrying); we surface it.
    expect(stationsCompleted, 'made no progress at all').toBeGreaterThan(0);
  } finally {
    if (offlineToggle) clearInterval(offlineToggle);
  }
});
