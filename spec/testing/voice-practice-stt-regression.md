# Voice practice STT (Whisper) — regression test cases

Scope: **`POST /voice-practice`** + client flow that records audio, sends it for transcription + evaluation, and renders a result.

Constraints:
- **Playwright CI** runs against **web** + mock servers. The **web UI disables microphone** in v1, so Playwright focuses on **API contract regression** and **web messaging**.
- Mobile mic recording is covered by a **manual checklist** (below) and can be automated later with device testing.

## Test data / assumptions

- **Target secret**: `{name_prefix}/llm-api-keys` contains JSON key **`openai`** (runtime only; never in client).
- **Auth**: API Gateway requires `Authorization: Bearer <jwt>`.
- **Payload** (JSON): `{ wordId, date, audioBase64, mimeType? }`.
- **Response**: matches `lib/voicePracticeTypes.ts` / spec requirements (`transcript`, `targetWord`, `attemptsRemaining`, `scoreCorrect`, etc).

## Automated (Playwright) regression cases

### VP-API-1: Unauthorized request rejected

- **Preconditions**: Have `TEST_API_BASE_URL` or `EXPO_PUBLIC_API_ENDPOINT` set to a reachable API.
- **Steps**: `POST /voice-practice` with a minimal body **without** Authorization header.
- **Expected**: HTTP **401**.

### VP-API-2: Mocked authorized request returns stable shape

- **Preconditions**: Playwright mock server is running (default in `test/playwright/playwright.config.mjs`).
- **Steps**: `POST /voice-practice` to mock base with `Authorization: Bearer playwright-mock-jwt`.
- **Expected**:
  - HTTP **200**
  - JSON contains at least:
    - `transcript` (string)
    - `targetWord` (string)
    - `attemptsRemaining` (number)
    - `scoreCorrect` (boolean)

### VP-API-3: Bad payload rejected (mock)

- **Preconditions**: Same as VP-API-2.
- **Steps**: `POST /voice-practice` with missing `audioBase64` (or missing `wordId`/`date`).
- **Expected**: HTTP **400** with `message`.

## Manual mobile regression checklist (v1)

### VP-MOB-1: Permissions UX
- First use asks for microphone permission.
- Denying shows a clear error and the UI remains usable.

### VP-MOB-2: Press-and-hold recording
- Holding starts recording immediately.
- Releasing stops and starts processing.
- Very short holds (< 0.5s) show a friendly hint (no network call).

### VP-MOB-3: Processing + rendering
- Spinner shown while uploading/processing.
- Response renders transcript, target word, score badge, and attempts remaining.

### VP-MOB-4: Attempt limits
- Attempts remaining decreases after each completed evaluation.
- After limit reached, API returns a clear error and UI shows it.

## Notes for future automation

- For true end-to-end mobile automation, use device testing (Detox/Maestro) with a bundled audio fixture and/or mocked network layer.

