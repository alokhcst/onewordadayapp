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

  test('P2: GET /word/today with TEST_JWT returns 200', async ({ request }) => {
    const base = apiBase();
    const token = process.env.TEST_JWT;
    test.skip(!base || !token, 'Set TEST_API_BASE_URL (or EXPO_PUBLIC_API_ENDPOINT) and TEST_JWT');
    const res = await request.get(`${base}/word/today`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('word');
  });
});
