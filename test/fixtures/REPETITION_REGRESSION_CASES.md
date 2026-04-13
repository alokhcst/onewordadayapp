# Word repetition & regression test matrix

Documented behavior to guard with automated tests (`test/playwright/repetition-logic.spec.ts`) and manual checks.

Run: `npm run test:e2e` (config: `test/playwright/playwright.config.mjs`).

## DynamoDB identity (per user, per day)

| ID | Case | Expected |
|----|------|----------|
| D1 | Same `userId` + `date` key | One canonical row; repeat GET returns same word |
| D2 | Different dates | Different rows allowed |

## Word bank path (`word-generation` / `get-todays-word` fallback)

| ID | Case | Expected |
|----|------|----------|
| W1 | `excludeWordIds` empty | No words filtered out |
| W2 | Recent `wordId`s match bank entries | Those entries removed from pool |
| W3 | All candidates excluded | Backend falls back to default word (serendipity) — logic tests cover empty pool |

## AI path (`ai-word-generation`)

| ID | Case | Expected |
|----|------|----------|
| A1 | Recent words → `avoidWords` Set | Lowercased; used in prompt |
| A2 | LLM returns duplicate | Retry up to 5 attempts; skip duplicate |
| A3 | Prompt list size | At most 100 words in avoid list string |

## `get-todays-word` on-demand AI prompt

| ID | Case | Expected |
|----|------|----------|
| G1 | Exclude list in prompt | Uses **last 30** recent word strings |
| G2 | Empty history | No exclude suffix |

## API smoke (Playwright `request`)

| ID | Case | Expected |
|----|------|----------|
| P1 | `GET /word/today` without `Authorization` | **401** |
| P2 | With valid JWT (optional `TEST_JWT`) | **200** and JSON with `word` |

## Web smoke (Playwright browser)

| ID | Case | Expected |
|----|------|----------|
| E1 | Load `/` on deployed or local web | Page loads; root content visible |
| E2 | `/signin` route | Reachable (Expo static export) |

## Environment variables (optional)

| Variable | Purpose |
|----------|---------|
| `PLAYWRIGHT_BASE_URL` | **Required for web smoke tests** (e.g. `https://…cloudfront.net` or `http://127.0.0.1:8081` while `expo start --web`) |
| `TEST_API_BASE_URL` | Override API root for API tests |
| `TEST_JWT` | Cognito ID token for authenticated `/word/today` (optional) |
