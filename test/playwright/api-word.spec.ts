/**
 * P1 always hits the real API (401 without auth).
 * P2 uses TEST_JWT + real base when set; otherwise the in-memory mock from playwright.config (PW_MOCK_PROFILE_URL).
 */
import { test, expect } from '@playwright/test';

function apiBase(): string | null {
  const b = process.env.TEST_API_BASE_URL || process.env.EXPO_PUBLIC_API_ENDPOINT;
  return b?.replace(/\/$/, '') ?? null;
}

test.describe('API regression (P1–P2)', () => {
  test('P1: GET /word/today without auth returns 401', async ({ request }) => {
    const base = apiBase();
    test.skip(!base, 'Set TEST_API_BASE_URL or EXPO_PUBLIC_API_ENDPOINT');
    const res = await request.get(`${base}/word/today`);
    expect(res.status(), await res.text()).toBe(401);
  });

  test('P2: GET /word/today with bearer returns 200', async ({ request }) => {
    const realBase = apiBase();
    const mockBase = process.env.PW_MOCK_PROFILE_URL?.replace(/\/$/, '');
    const token = process.env.TEST_JWT || 'playwright-mock-jwt';
    const base = process.env.TEST_JWT ? realBase : mockBase;
    test.skip(
      !base,
      'Need EXPO_PUBLIC_API_ENDPOINT (or TEST_API_BASE_URL) with TEST_JWT for live API, or PW_MOCK_PROFILE_URL from Playwright for mock'
    );
    const res = await request.get(`${base}/word/today`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('word');
  });
});
