---
name: run-all-tests
description: >-
  Runs the full local test and quality suite for this repo: Playwright e2e (including
  mock servers), ESLint, and TypeScript check. Use when the user asks to run all tests,
  verify CI locally, regression test, or before deploy/commit.
---

# Run all tests (One Word A Day app)

## Order of execution

Run from the **repository root** after `npm ci` (or at least `npm install`).

```
1. npm run lint
2. npx tsc --noEmit
3. npm run test:e2e
```

Fix failures before committing or triggering **Build Packages**.

## 1. Lint

```bash
npm run lint
```

Uses Expo’s ESLint config (`expo lint`).

## 2. TypeScript

There is no `typecheck` npm script by default; CI uses `npm run typecheck --if-present` (may no-op). Run:

```bash
npx tsc --noEmit
```

## 3. Playwright (all e2e / regression tests)

First-time or fresh clone (Chromium only):

```bash
npm run test:e2e:install
```

Full suite (starts **mock profile** + **web fixture** servers via `test/playwright/playwright.config.mjs`):

```bash
npm run test:e2e
```

Equivalent:

```bash
npx playwright test --config=test/playwright/playwright.config.mjs
```

### What this covers

| Area | Specs / behavior |
|------|-------------------|
| API | `api-word.spec.ts` — P1 real API 401; P2 mock or live `/word/today` |
| Daily word prefs | `daily-word-notification-preferences.spec.ts` — H1–H6 helpers; A1–A5 profile API (mock or live with `TEST_JWT`); W1 welcome copy |
| Web smoke | `web-smoke.spec.ts` — E1/E2 against fixture server |
| Repetition logic | `repetition-logic.spec.ts` — word bank / prompt helpers |

Expect **27 passed** when mocks + fixtures are used (default; no `TEST_JWT` required).

### Optional: live API slice

With real Cognito JWT and deployed API:

- Set **`TEST_JWT`** in `.env` (loaded by Playwright config).
- **`EXPO_PUBLIC_API_ENDPOINT`** (or **`TEST_API_BASE_URL`**) is already in `.env` for P1 and for profile tests when `TEST_JWT` is set.

### Optional: real Expo web instead of fixture

Set **`PLAYWRIGHT_BASE_URL`** to the dev server origin (e.g. `http://127.0.0.1:8081`) and run Expo separately; E1/E2/W1 then hit the real bundle.

### Env reference (Playwright)

| Variable | Role |
|----------|------|
| `PW_MOCK_PROFILE_URL` | Set by config; mock `/user/profile` + mock `/word/today` |
| `PLAYWRIGHT_BASE_URL` | Web tests; defaults to fixture server |
| `TEST_JWT` | Switch A-tests and P2 to **live** API |
| `MOCK_PROFILE_API_PORT` / `PLAYWRIGHT_WEB_FIXTURE_PORT` | Override ports if conflicts |

## Quick one-liner (after deps installed)

```bash
npm run lint && npx tsc --noEmit && npm run test:e2e
```

## If Playwright fails

- **Port in use**: set `MOCK_PROFILE_API_PORT` / `PLAYWRIGHT_WEB_FIXTURE_PORT` or stop conflicting processes.
- **Browser missing**: `npm run test:e2e:install`
- **CI without browsers**: ensure workflow runs `npx playwright install chromium` before `npm run test:e2e` if e2e is added to CI later.
