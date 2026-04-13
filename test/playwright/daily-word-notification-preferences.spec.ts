/**
 * Regression: daily word notification preferences (profile schedule + API merge).
 *
 * Case IDs (use in commits/PRs):
 *   H1–H6  Client helpers (`lib/notificationPreferences.ts`) — always run in Node.
 *   A1–A5  GET/PUT `/user/profile` — use in-memory mock when TEST_JWT is unset (started via playwright.config webServer),
 *         or real API when TEST_JWT + TEST_API_BASE_URL / EXPO_PUBLIC_API_ENDPOINT are set.
 *   W1     Web welcome copy — PLAYWRIGHT_BASE_URL defaults to web-fixture-server from playwright.config.
 *
 * Env:
 *   PW_MOCK_PROFILE_URL — override mock profile origin (default http://127.0.0.1:48765).
 *   TEST_JWT + TEST_API_BASE_URL | EXPO_PUBLIC_API_ENDPOINT — run A-tests against production/staging API instead of mock.
 */

import { test, expect } from '@playwright/test';
import {
  normalizeDailyWordPrefs,
  parseTimeToParts,
  toStoredDailyWordPrefs,
  defaultDailyWordPrefs,
} from '../../lib/notificationPreferences';

function apiBase(): string | null {
  const b = process.env.TEST_API_BASE_URL || process.env.EXPO_PUBLIC_API_ENDPOINT;
  return b?.replace(/\/$/, '') ?? null;
}

/** Real API when TEST_JWT is set; otherwise local mock (see test/playwright/mock-user-profile-server.mjs). */
function profileApiBase(): string {
  if (process.env.TEST_JWT) {
    const b = apiBase();
    if (!b) {
      throw new Error('Set TEST_API_BASE_URL or EXPO_PUBLIC_API_ENDPOINT when using TEST_JWT');
    }
    return b;
  }
  const mock = process.env.PW_MOCK_PROFILE_URL?.replace(/\/$/, '');
  if (!mock) {
    throw new Error('PW_MOCK_PROFILE_URL should be set by playwright.config.mjs');
  }
  return mock;
}

function profileAuthToken(): string {
  return process.env.TEST_JWT || 'playwright-mock-jwt';
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

test.describe('Daily word notification preferences', () => {
  test.describe('H1–H6: client normalization & storage shape', () => {
    test('H1: parseTimeToParts accepts valid HH:mm', () => {
      expect(parseTimeToParts('09:00')).toEqual({ hour: 9, minute: 0 });
      expect(parseTimeToParts('23:59')).toEqual({ hour: 23, minute: 59 });
    });

    test('H2: parseTimeToParts rejects invalid times', () => {
      expect(parseTimeToParts('9:0')).toBeNull();
      expect(parseTimeToParts('24:00')).toBeNull();
      expect(parseTimeToParts('12:60')).toBeNull();
      expect(parseTimeToParts('')).toBeNull();
    });

    test('H3: normalizeDailyWordPrefs uses defaults for empty input', () => {
      const d = normalizeDailyWordPrefs(undefined);
      expect(d.frequency).toBe('once_daily');
      expect(d.primaryTime).toBe('09:00');
      expect(d.secondaryTime).toBe('18:00');
      expect(d.enabled).toBe(true);
    });

    test('H4: normalizeDailyWordPrefs maps legacy time to primaryTime', () => {
      const d = normalizeDailyWordPrefs({ time: '14:30' } as Record<string, unknown>);
      expect(d.primaryTime).toBe('14:30');
      expect(d.time).toBe('14:30');
    });

    test('H5: normalizeDailyWordPrefs respects twice_daily', () => {
      const d = normalizeDailyWordPrefs({
        frequency: 'twice_daily',
        primaryTime: '08:00',
        secondaryTime: '20:00',
      } as Record<string, unknown>);
      expect(d.frequency).toBe('twice_daily');
      expect(d.primaryTime).toBe('08:00');
      expect(d.secondaryTime).toBe('20:00');
    });

    test('H6: toStoredDailyWordPrefs keeps time in sync with primaryTime', () => {
      const base = defaultDailyWordPrefs();
      const stored = toStoredDailyWordPrefs({
        ...base,
        primaryTime: '11:15',
        frequency: 'twice_daily',
        secondaryTime: '17:45',
      });
      expect(stored.time).toBe('11:15');
      expect(stored.primaryTime).toBe('11:15');
      expect(stored.frequency).toBe('twice_daily');
      expect(stored.secondaryTime).toBe('17:45');
    });
  });

  test.describe('A1–A5: API /user/profile dailyWord merge & schedule', () => {
    test.describe.configure({ mode: 'serial' });

    test('A1: GET profile includes notificationPreferences.dailyWord with expected keys', async ({
      request,
    }) => {
      const base = profileApiBase();
      const token = profileAuthToken();
      const res = await request.get(`${base}/user/profile`, { headers: authHeaders(token) });
      expect(res.status(), await res.text()).toBe(200);
      const body = await res.json();
      expect(body.profile).toBeTruthy();
      const daily = body.profile.notificationPreferences?.dailyWord;
      expect(daily, 'dailyWord should be present after merge/defaults').toBeTruthy();
      expect(daily).toHaveProperty('enabled');
      expect(daily).toHaveProperty('frequency');
      expect(daily).toHaveProperty('primaryTime');
      expect(['once_daily', 'twice_daily']).toContain(daily.frequency);
    });

    test('A2: partial PUT merges dailyWord without wiping frequency', async ({ request }) => {
      const base = profileApiBase();
      const token = profileAuthToken();
      const getRes = await request.get(`${base}/user/profile`, { headers: authHeaders(token) });
      expect(getRes.status()).toBe(200);
      const before = await getRes.json();
      const prevPrefs = clone(before.profile.notificationPreferences);

      const freqBefore = before.profile.notificationPreferences?.dailyWord?.frequency ?? 'once_daily';

      const patchRes = await request.put(`${base}/user/profile`, {
        headers: authHeaders(token),
        data: {
          notificationPreferences: {
            dailyWord: { primaryTime: '14:05', time: '14:05' },
          },
        },
      });
      expect(patchRes.status(), await patchRes.text()).toBe(200);

      const afterRes = await request.get(`${base}/user/profile`, { headers: authHeaders(token) });
      expect(afterRes.status()).toBe(200);
      const after = await afterRes.json();
      const daily = after.profile.notificationPreferences.dailyWord;
      expect(daily.primaryTime).toBe('14:05');
      expect(daily.time).toBe('14:05');
      expect(daily.frequency).toBe(freqBefore);

      const restoreRes = await request.put(`${base}/user/profile`, {
        headers: authHeaders(token),
        data: { notificationPreferences: prevPrefs },
      });
      expect(restoreRes.status(), await restoreRes.text()).toBe(200);
    });

    test('A3: PUT full twice_daily schedule persists', async ({ request }) => {
      const base = profileApiBase();
      const token = profileAuthToken();
      const getRes = await request.get(`${base}/user/profile`, { headers: authHeaders(token) });
      expect(getRes.status()).toBe(200);
      const before = await getRes.json();
      const prevPrefs = clone(before.profile.notificationPreferences);

      const payload = {
        notificationPreferences: {
          dailyWord: {
            enabled: true,
            frequency: 'twice_daily',
            primaryTime: '07:30',
            secondaryTime: '19:15',
            channels: ['local'],
            timezone: 'America/New_York',
            time: '07:30',
          },
        },
      };

      const putRes = await request.put(`${base}/user/profile`, {
        headers: authHeaders(token),
        data: payload,
      });
      expect(putRes.status(), await putRes.text()).toBe(200);

      const checkRes = await request.get(`${base}/user/profile`, { headers: authHeaders(token) });
      const check = await checkRes.json();
      const d = check.profile.notificationPreferences.dailyWord;
      expect(d.frequency).toBe('twice_daily');
      expect(d.primaryTime).toBe('07:30');
      expect(d.secondaryTime).toBe('19:15');
      expect(d.time).toBe('07:30');
      expect(d.timezone).toBe('America/New_York');

      const restoreRes = await request.put(`${base}/user/profile`, {
        headers: authHeaders(token),
        data: { notificationPreferences: prevPrefs },
      });
      expect(restoreRes.status(), await restoreRes.text()).toBe(200);
    });

    test('A4: PUT dailyWord.enabled false persists', async ({ request }) => {
      const base = profileApiBase();
      const token = profileAuthToken();
      const getRes = await request.get(`${base}/user/profile`, { headers: authHeaders(token) });
      expect(getRes.status()).toBe(200);
      const before = await getRes.json();
      const prevPrefs = clone(before.profile.notificationPreferences);

      const putRes = await request.put(`${base}/user/profile`, {
        headers: authHeaders(token),
        data: { notificationPreferences: { dailyWord: { enabled: false } } },
      });
      expect(putRes.status(), await putRes.text()).toBe(200);

      const checkRes = await request.get(`${base}/user/profile`, { headers: authHeaders(token) });
      const check = await checkRes.json();
      expect(check.profile.notificationPreferences.dailyWord.enabled).toBe(false);

      await request.put(`${base}/user/profile`, {
        headers: authHeaders(token),
        data: { notificationPreferences: prevPrefs },
      });
    });

    test('A5: partial PUT does not remove feedbackReminder / milestones', async ({ request }) => {
      const base = profileApiBase();
      const token = profileAuthToken();
      const getRes = await request.get(`${base}/user/profile`, { headers: authHeaders(token) });
      expect(getRes.status()).toBe(200);
      const before = await getRes.json();
      const prevPrefs = clone(before.profile.notificationPreferences);

      const frBefore = before.profile.notificationPreferences?.feedbackReminder;
      const msBefore = before.profile.notificationPreferences?.milestones;

      const putRes = await request.put(`${base}/user/profile`, {
        headers: authHeaders(token),
        data: {
          notificationPreferences: {
            dailyWord: { primaryTime: '10:10', time: '10:10' },
          },
        },
      });
      expect(putRes.status(), await putRes.text()).toBe(200);

      const afterRes = await request.get(`${base}/user/profile`, { headers: authHeaders(token) });
      const after = await afterRes.json();
      const np = after.profile.notificationPreferences;
      expect(np.feedbackReminder).toEqual(frBefore);
      expect(np.milestones).toEqual(msBefore);

      await request.put(`${base}/user/profile`, {
        headers: authHeaders(token),
        data: { notificationPreferences: prevPrefs },
      });
    });
  });

  test.describe('W1: web shell (unauthenticated welcome)', () => {
    const webBase = process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, '') ?? '';

    test.beforeEach(() => {
      test.skip(!webBase, 'Set PLAYWRIGHT_BASE_URL (e.g. http://127.0.0.1:8081) for web regression');
    });

    test('W1: home shows app title for guests (profile settings not required here)', async ({ page }) => {
      await page.goto(`${webBase}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await expect(page.getByText('One Word A Day')).toBeVisible({ timeout: 45_000 });
      await expect(page.getByText('Sign In')).toBeVisible();
    });
  });
});
