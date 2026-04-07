import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './walkthroughs',
  timeout: 600_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    viewport: { width: 1280, height: 720 },
    video: {
      mode: 'on',
      size: { width: 1280, height: 720 },
    },
    launchOptions: {
      slowMo: 0, // use explicit pause() calls instead for consistent video timing
    },
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
  },
  projects: [
    {
      name: 'walkthroughs',
      use: { browserName: 'chromium' },
    },
  ],
  outputDir: './walkthrough-videos',
});
