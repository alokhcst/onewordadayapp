import { test, expect } from '@playwright/test';

/**
 * Requires PLAYWRIGHT_BASE_URL (e.g. CloudFront HTTPS or local `npx expo start --web`).
 * Omit in CI/sandbox when no reachable web host — logic + API tests still run.
 */
const webBase = process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, '') ?? '';

test.describe('Web smoke (E1–E2)', () => {
  test.beforeEach(() => {
    test.skip(!webBase, 'Set PLAYWRIGHT_BASE_URL to run browser smoke (e.g. https://xxx.cloudfront.net)');
  });

  test('E1: root loads with visible content', async ({ page }) => {
    await page.goto(`${webBase}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(0);
  });

  test('E2: signin route responds', async ({ page }) => {
    const res = await page.goto(`${webBase}/signin`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    expect(res?.ok() ?? false).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
  });
});
