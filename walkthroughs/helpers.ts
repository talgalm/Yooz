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

export function startNarration() {
  narrationLog.length = 0;
  recordingStartTime = Date.now();
}

export function getNarrationLog() {
  return [...narrationLog];
}

/**
 * Show a floating caption banner AND record it for voice narration.
 * The caption stays visible for durationMs, and we wait for it to finish + buffer.
 */
export async function showCaption(page: Page, text: string, durationMs = 3500) {
  narrationLog.push({ text, timestampMs: Date.now() - recordingStartTime });

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
  );

  // Wait for caption to finish + buffer for voice to complete
  await page.waitForTimeout(durationMs + 800);
}

/**
 * Highlight an element, click it, then pause so voice can play.
 */
export async function highlightAndClick(page: Page, selector: string, caption?: string) {
  // Show caption and highlight AT THE SAME TIME — don't wait for caption to finish
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();

  // Add highlight
  await el.evaluate((node) => {
    (node as HTMLElement).style.outline = '3px solid #e74c3c';
    (node as HTMLElement).style.outlineOffset = '4px';
    (node as HTMLElement).style.transition = 'outline 0.3s';
  });

  // Show caption while element is highlighted — voice starts here
  if (caption) {
    // Record narration timestamp
    narrationLog.push({ text: caption, timestampMs: Date.now() - recordingStartTime });
    await page.evaluate(
      ({ text }) => {
        document.getElementById('walkthrough-caption')?.remove();
        const el = document.createElement('div');
        el.id = 'walkthrough-caption';
        Object.assign(el.style, {
          position: 'fixed', bottom: '32px', left: '50%',
          transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.82)',
          color: '#fff', padding: '14px 32px', borderRadius: '12px',
          fontSize: '22px', fontFamily: 'Arial, sans-serif', zIndex: '999999',
          direction: 'rtl', textAlign: 'center', maxWidth: '80vw',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)', transition: 'opacity 0.4s', opacity: '0',
        });
        el.textContent = text;
        document.body.appendChild(el);
        requestAnimationFrame(() => { el.style.opacity = '1'; });
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 3000);
      },
      { text: caption },
    );
    // Wait so viewer sees highlight + reads caption before click
    await page.waitForTimeout(2000);
  } else {
    await page.waitForTimeout(1000);
  }

  // Click
  await el.click();

  // Remove highlight
  await el.evaluate((node) => {
    (node as HTMLElement).style.outline = '';
    (node as HTMLElement).style.outlineOffset = '';
  }).catch(() => {});

  // Pause after click for voice to finish
  await page.waitForTimeout(1500);
}

/**
 * Highlight a field, type slowly into it (character by character), then pause.
 */
export async function highlightAndFill(page: Page, selector: string, value: string, caption?: string) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();

  // Add highlight
  await el.evaluate((node) => {
    (node as HTMLElement).style.outline = '3px solid #e74c3c';
    (node as HTMLElement).style.outlineOffset = '4px';
  });

  // Show caption while element is highlighted
  if (caption) {
    narrationLog.push({ text: caption, timestampMs: Date.now() - recordingStartTime });
    await page.evaluate(
      ({ text }) => {
        document.getElementById('walkthrough-caption')?.remove();
        const el = document.createElement('div');
        el.id = 'walkthrough-caption';
        Object.assign(el.style, {
          position: 'fixed', bottom: '32px', left: '50%',
          transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.82)',
          color: '#fff', padding: '14px 32px', borderRadius: '12px',
          fontSize: '22px', fontFamily: 'Arial, sans-serif', zIndex: '999999',
          direction: 'rtl', textAlign: 'center', maxWidth: '80vw',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)', transition: 'opacity 0.4s', opacity: '0',
        });
        el.textContent = text;
        document.body.appendChild(el);
        requestAnimationFrame(() => { el.style.opacity = '1'; });
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 4000);
      },
      { text: caption },
    );
    await page.waitForTimeout(1000);
  }

  // Click field
  await el.click();
  await page.waitForTimeout(300);

  // Type slowly — character by character with delay
  await el.pressSequentially(value, { delay: 80 });

  // Pause after typing for voice to finish
  await page.waitForTimeout(1500);

  // Remove highlight
  await el.evaluate((node) => {
    (node as HTMLElement).style.outline = '';
    (node as HTMLElement).style.outlineOffset = '';
  }).catch(() => {});
}

export async function pause(page: Page, ms = 2000) {
  await page.waitForTimeout(ms);
}

/**
 * Save narration log to a JSON file.
 */
export function saveNarrationLog(outputJsonPath: string) {
  const dir = path.dirname(outputJsonPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(outputJsonPath, JSON.stringify(getNarrationLog(), null, 2));
}
