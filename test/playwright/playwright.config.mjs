import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const MOCK_PROFILE_PORT = process.env.MOCK_PROFILE_API_PORT || '48765';
const WEB_FIXTURE_PORT = process.env.PLAYWRIGHT_WEB_FIXTURE_PORT || '8091';
const mockProfileUrl = `http://127.0.0.1:${MOCK_PROFILE_PORT}`;
const webFixtureUrl = `http://127.0.0.1:${WEB_FIXTURE_PORT}`;

/** Mock profile API URL for daily-word A-tests when TEST_JWT is unset (see spec). */
process.env.PW_MOCK_PROFILE_URL = process.env.PW_MOCK_PROFILE_URL || mockProfileUrl;

/**
 * Web smoke + W1: use fixture server by default (fast). Override with PLAYWRIGHT_BASE_URL for real Expo web.
 */
if (!process.env.PLAYWRIGHT_BASE_URL) {
  process.env.PLAYWRIGHT_BASE_URL = webFixtureUrl;
}

const mockServerPath = path.join(__dirname, 'mock-user-profile-server.mjs');
const webFixturePath = path.join(__dirname, 'web-fixture-server.mjs');

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
  webServer: [
    {
      command: `node "${mockServerPath}"`,
      url: `${mockProfileUrl}/health`,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        MOCK_PROFILE_API_PORT: MOCK_PROFILE_PORT,
      },
    },
    {
      command: `node "${webFixturePath}"`,
      url: `${webFixtureUrl}/health`,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        PLAYWRIGHT_WEB_FIXTURE_PORT: WEB_FIXTURE_PORT,
      },
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
