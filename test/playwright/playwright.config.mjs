import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

/** @type {import('@playwright/test').PlaywrightTestConfig} */
export default defineConfig({
  testDir: __dirname,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  outputDir: path.join(__dirname, '..', 'test-results', 'playwright-output'),
  use: {
    ...(process.env.PLAYWRIGHT_BASE_URL
      ? {
          baseURL: process.env.PLAYWRIGHT_BASE_URL.replace(/\/$/, ''),
        }
      : {}),
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
