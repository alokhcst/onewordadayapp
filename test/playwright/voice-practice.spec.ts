import { test, expect } from '@playwright/test';

function apiBase(): string | null {
  const b = process.env.TEST_API_BASE_URL || process.env.EXPO_PUBLIC_API_ENDPOINT;
  return b?.replace(/\/$/, '') ?? null;
}

test.describe('Voice practice STT regression (VP-API-*)', () => {
  test('VP-API-1: POST /voice-practice without auth returns 401', async ({ request }) => {
    const base = apiBase();
    test.skip(!base, 'Set TEST_API_BASE_URL or EXPO_PUBLIC_API_ENDPOINT');
    const res = await request.post(`${base}/voice-practice`, {
      data: {
        wordId: 'mock-word-id',
        date: '2026-04-14',
        audioBase64: 'AA==',
        mimeType: 'audio/m4a',
      },
    });
    // API Gateway commonly returns 401 for missing/invalid auth. Some configurations return
    // 403 "Missing Authentication Token" when the route/stage doesn't match or authorizer blocks early.
    const status = res.status();
    expect([401, 403], await res.text()).toContain(status);
  });

  test('VP-API-2: POST /voice-practice with bearer returns stable shape (mock by default)', async ({
    request,
  }) => {
    const realBase = apiBase();
    const mockBase = process.env.PW_MOCK_PROFILE_URL?.replace(/\/$/, '');
    const token = process.env.TEST_JWT || 'playwright-mock-jwt';
    const base = process.env.TEST_JWT ? realBase : mockBase;
    test.skip(
      !base,
      'Need EXPO_PUBLIC_API_ENDPOINT (or TEST_API_BASE_URL) with TEST_JWT for live API, or PW_MOCK_PROFILE_URL from Playwright for mock'
    );

    const res = await request.post(`${base}/voice-practice`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        wordId: 'mock-word-id',
        date: '2026-04-14',
        audioBase64: 'AA==',
        mimeType: 'audio/m4a',
      },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('transcript');
    expect(typeof body.transcript).toBe('string');
    expect(body).toHaveProperty('targetWord');
    expect(typeof body.targetWord).toBe('string');
    expect(body).toHaveProperty('attemptsRemaining');
    expect(typeof body.attemptsRemaining).toBe('number');
    expect(body).toHaveProperty('scoreCorrect');
    expect(typeof body.scoreCorrect).toBe('boolean');
  });

  test('VP-API-3: POST /voice-practice missing audioBase64 returns 400 (mock)', async ({ request }) => {
    const mockBase = process.env.PW_MOCK_PROFILE_URL?.replace(/\/$/, '');
    test.skip(!mockBase, 'PW_MOCK_PROFILE_URL is set by Playwright config');
    const res = await request.post(`${mockBase}/voice-practice`, {
      headers: { Authorization: 'Bearer playwright-mock-jwt' },
      data: { wordId: 'mock-word-id', date: '2026-04-14' },
    });
    expect(res.status(), await res.text()).toBe(400);
  });
});

