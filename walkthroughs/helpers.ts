import { Page } from '@playwright/test';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import path from 'path';

// Track narration segments for post-processing
interface NarrationSegment {
  text: string;
  timestampMs: number;
}

const narrationLog: NarrationSegment[] = [];
let recordingStartTime = 0;

// When set (by the tutorial pipeline via env), narration is flushed to this path after every
// caption — so an AI-generated spec that throws partway still leaves a usable narration file
// on disk instead of losing the whole voiceover track. The spec's own saveNarrationLog() call
// remains a final flush for the static walkthroughs.
const narrationOutputPath = process.env.NARRATION_OUTPUT || '';

function writeNarration(outputJsonPath: string) {
  const dir = path.dirname(outputJsonPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(outputJsonPath, JSON.stringify(getNarrationLog(), null, 2));
}

/** Record a narration segment and (best-effort) flush the running log to disk. */
function recordNarration(text: string) {
  narrationLog.push({ text, timestampMs: Date.now() - recordingStartTime });
  if (narrationOutputPath) {
    try { writeNarration(narrationOutputPath); } catch { /* best-effort */ }
  }
}

export function startNarration() {
  narrationLog.length = 0;
  recordingStartTime = Date.now();
}

export function getNarrationLog() {
  return [...narrationLog];
}

/**
 * Inject the floating caption banner into the page. Never throws — the caption is
 * cosmetic, so a failed injection must not abort the walkthrough.
 */
async function renderCaption(page: Page, text: string, durationMs: number) {
  await page.evaluate(
    ({ text, durationMs }) => {
      document.getElementById('walkthrough-caption')?.remove();

      const el = document.createElement('div');
      el.id = 'walkthrough-caption';
      Object.assign(el.style, {
        position: 'fixed',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.82)',
        color: '#fff',
        padding: '14px 32px',
        borderRadius: '12px',
        fontSize: '22px',
        fontFamily: 'Arial, sans-serif',
        zIndex: '999999',
        direction: 'rtl',
        textAlign: 'center',
        maxWidth: '80vw',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        transition: 'opacity 0.4s',
        opacity: '0',
      });
      el.textContent = text;
      document.body.appendChild(el);

      requestAnimationFrame(() => {
        el.style.opacity = '1';
      });

      setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 400);
      }, durationMs);
    },
    { text, durationMs },
  ).catch(() => {});
}

/**
 * Resolve an element if it becomes visible within a short window. Returns null instead of
 * throwing when the selector matches nothing — this is what keeps a single bad/hallucinated
 * selector (common in AI-generated specs) from aborting the whole video. A missing element
 * degrades to "skip this interaction" while the caption + narration still play.
 */
async function resolveVisible(page: Page, selector: string, timeout = 5000) {
  const el = page.locator(selector).first();
  const ok = await el.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
  return ok ? el : null;
}

/**
 * Show a floating caption banner AND record it for voice narration.
 * The caption stays visible for durationMs, and we wait for it to finish + buffer.
 */
export async function showCaption(page: Page, text: string, durationMs = 3500) {
  recordNarration(text);
  await renderCaption(page, text, durationMs);
  // Wait for caption to finish + buffer for voice to complete
  await page.waitForTimeout(durationMs + 800);
}

/**
 * Highlight an element, click it, then pause so voice can play.
 * Resilient: if the selector matches nothing, the caption/narration still play and the
 * step is skipped rather than failing the whole walkthrough.
 */
export async function highlightAndClick(page: Page, selector: string, caption?: string) {
  const el = await resolveVisible(page, selector);

  // Highlight (only if the element exists)
  if (el) {
    await el.scrollIntoViewIfNeeded().catch(() => {});
    await el.evaluate((node) => {
      (node as HTMLElement).style.outline = '3px solid #e74c3c';
      (node as HTMLElement).style.outlineOffset = '4px';
      (node as HTMLElement).style.transition = 'outline 0.3s';
    }).catch(() => {});
  }

  // Show caption while element is highlighted — voice starts here. Always runs so the
  // narration track stays complete even when the target element is missing.
  if (caption) {
    recordNarration(caption);
    await renderCaption(page, caption, 3000);
    // Wait so viewer sees highlight + reads caption before click
    await page.waitForTimeout(2000);
  } else {
    await page.waitForTimeout(1000);
  }

  if (el) {
    await el.click().catch(() => {});
    await el.evaluate((node) => {
      (node as HTMLElement).style.outline = '';
      (node as HTMLElement).style.outlineOffset = '';
    }).catch(() => {});
  }

  // Pause after click for voice to finish
  await page.waitForTimeout(1500);
}

/**
 * Highlight a field, type slowly into it (character by character), then pause.
 * Resilient: a missing field skips the fill instead of aborting the walkthrough.
 */
export async function highlightAndFill(page: Page, selector: string, value: string, caption?: string) {
  const el = await resolveVisible(page, selector);

  if (el) {
    await el.scrollIntoViewIfNeeded().catch(() => {});
    await el.evaluate((node) => {
      (node as HTMLElement).style.outline = '3px solid #e74c3c';
      (node as HTMLElement).style.outlineOffset = '4px';
    }).catch(() => {});
  }

  // Show caption while element is highlighted
  if (caption) {
    recordNarration(caption);
    await renderCaption(page, caption, 4000);
    await page.waitForTimeout(1000);
  }

  if (el) {
    await el.click().catch(() => {});
    await page.waitForTimeout(300);
    // Type slowly — character by character with delay
    await el.pressSequentially(value, { delay: 80 }).catch(() => {});
    // Pause after typing for voice to finish
    await page.waitForTimeout(1500);
    await el.evaluate((node) => {
      (node as HTMLElement).style.outline = '';
      (node as HTMLElement).style.outlineOffset = '';
    }).catch(() => {});
  } else {
    await page.waitForTimeout(1500);
  }
}

export async function pause(page: Page, ms = 2000) {
  await page.waitForTimeout(ms);
}

/**
 * Save narration log to a JSON file.
 */
export function saveNarrationLog(outputJsonPath: string) {
  writeNarration(outputJsonPath);
}
