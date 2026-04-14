# Voice practice (Speech-to-Text + Whisper + AI review)

**Status:** Draft requirements  
**Related:** [HISTORY_FEATURE_ENHANCEMENT.md](../documents/HISTORY_FEATURE_ENHANCEMENT.md), feedback processor (`POST /feedback`), `lib/points.ts`, `expo-av`

## 1. Goal

Let a learner **practice saying the day’s word** (or a word from context) using **press-and-hold recording**, send audio to **OpenAI Whisper** for transcription, then run an **evaluation pass** that returns mistakes, suggestions, a short **AI review** (what went well / what to improve), and **follow-up questions**. Cap usage at **10 practice attempts per word per calendar day** (configurable). When the user **scores correctly** (see §6), mark the word **practiced** and **award points** consistent with existing membership logic.

## 2. User experience

### 2.1 Recording

- Primary control: **“Start speaking”** (or **“Hold to speak”**) implemented as **press and hold** (pointer down → start recording; pointer up / release → stop).
- **Maximum recording length:** 60 seconds. If the user holds longer, **auto-stop** at 60s and treat as release (same pipeline).
- **Minimum useful length:** product decision (e.g. ignore &lt; 0.5s as accidental tap); show a non-blocking hint.
- While recording: clear **visual state** (pulsing mic, timer optional, “Recording…”).
- **Permissions:** request microphone permission before first use; graceful degradation if denied (copy + link to settings on native).

### 2.2 After release (stop)

1. Show **uploading / processing** state (spinner, non-blocking cancel if still allowed).
2. When the server responds, show:
   - **Transcript** (Whisper output).
   - **Target vs attempt** (normalized comparison; see §5).
   - **Mistakes** (specific sounds/words/phrasing).
   - **Suggestions** (how to say it better).
   - **AI review** (short: strengths + improvements).
   - **Follow-up questions** (1–3, optional answer flow in v2).

### 2.3 Attempt limit

- **Max 10 practice attempts** per `(userId, wordId, UTC date)` (or local calendar date—**decide one** and document in API). User sees remaining attempts (e.g. “3 attempts left today”).
- Attempt **increments on each completed evaluation** (successful round-trip), not on failed network before evaluation.

### 2.4 Success and rewards

- **“Correct”** is defined in §6. On success:
  - Mark word **practiced** for that day (align with `practiceStatus` / `practiced` in history—see existing feedback model).
  - **Award points** using the same order of magnitude as existing feedback rewards (`POINTS_PER_FEEDBACK` = 1000 in backend today)—exact amount TBD (may be same, lower for voice-only, or tiered by score).
  - Show success UI + optional confetti / toast; refresh profile points if already loaded.

### 2.5 Platform notes

- **iOS / Android:** `expo-av` (or supported Expo audio recording API for SDK 54+) with formats Whisper accepts (e.g. m4a/wav—confirm in implementation).
- **Web:** microphone APIs differ; may require **separate QA** and possibly **feature flag** or reduced UX until stable.

## 3. Non-goals (v1)

- Real-time streaming STT during hold (only file-based Whisper after release).
- Pronunciation scoring from a dedicated phoneme API (optional future).
- Storing raw audio long-term (see §8).

## 4. API / backend (high level)

### 4.1 Suggested flow

1. **Client** records audio → **upload** to backend (multipart `POST` or **presigned S3 URL** then notify Lambda—prefer presigned for large payloads and Lambda limits).
2. **Lambda** (or container):
   - Calls **OpenAI Whisper** (`audio.transcriptions` or REST) with language hint if useful.
   - Runs **evaluation** step (GPT or rules + GPT): structured JSON with fields in §5.
   - Persists attempt + result; enforces **attempt count** and idempotency keys.
3. On **correct**: update user word practice state + **points** (reuse patterns from `feedback-processor` / `updateUserPointsAndMembership` or shared module).

### 4.2 New / extended data

- **Practice attempt record:** `userId`, `wordId`, `date`, `attemptIndex`, `transcript`, `evaluationPayload` (JSON), `scoreCorrect`, `createdAt`, optional `audioRef` (delete after processing).
- **Idempotency:** optional client `Idempotency-Key` per finished recording to avoid double-submit.

### 4.3 Secrets

- `OPENAI_API_KEY` (or AWS Secrets Manager) in Lambda env; **never** expose to client.

## 5. Evaluation output (contract)

Server returns a JSON object (example shape; refine during implementation):

```json
{
  "transcript": "string",
  "targetWord": "string",
  "normalizedMatch": false,
  "mistakes": ["string"],
  "suggestions": ["string"],
  "review": {
    "whatWentWell": ["string"],
    "toImprove": ["string"]
  },
  "followUpQuestions": ["string"],
  "attemptsRemaining": 7,
  "scoreCorrect": false,
  "pointsAwarded": 0,
  "practicedMarked": false
}
```

**Normalization:** compare lowercase, trim, strip punctuation; optional: allow plural/inflection if product allows (document decision).

## 6. “Correct” definition (to finalize)

Pick one or combine:

- **Strict:** normalized transcript **equals** target word/phrase.
- **Lenient:** Whisper transcript contains target as whole word; or edit distance ≤ N.
- **Score threshold:** future: numeric score from LLM; v1 recommend **boolean** from clear rules to avoid ambiguity.

## 7. AI review and follow-ups

- **Review** must be **supportive** and **short** (token limits); avoid humiliating tone (content policy).
- **Follow-up questions** should relate to **usage** of the word (context, collocations), not unrelated trivia—optional **“Answer”** in v2.

## 8. Privacy and retention

- **Audio:** process then **delete** blob from S3 within N hours (e.g. 24h) unless user opts in for debugging (not v1).
- **Transcripts:** store with attempt record for support/analytics; align with product privacy notice.
- **Logs:** redact PII in CloudWatch.

## 9. Observability

- Metrics: attempts per user, Whisper latency, error rate, % correct.
- Alerts on OpenAI quota / 5xx spikes.

## 10. Testing

- Unit: normalization and “correct” logic.
- Integration: mock Whisper + GPT responses.
- E2E: optional smoke with recorded fixture file (no live mic in CI).

## 11. Open questions

1. Same **10 attempts** across devices (server-enforced) vs per device only?
2. Points: **same as** `POST /feedback` or **separate** voice-practice reward once per day per word?
3. Should **incorrect** attempts still give **partial** points (probably no in v1)?
4. Custom domain / rate limits per user to control OpenAI cost?

---

## 12. Implementation notes (repo)

- **API:** `POST /voice-practice` (Cognito) — body JSON `{ wordId, date, audioBase64, mimeType? }`. Response matches §5 (`pointsAwarded`, `reward`, etc.).
- **Backend:** Lambda `voice-practice` (`backend/src/voice-practice/index.js`), Whisper + `gpt-4o-mini` evaluation. OpenAI key: JSON key `openai` in existing Secrets Manager secret (`SECRET_NAME` / `llm-api-keys`), or env `OPENAI_API_KEY` on the Lambda.
- **Attempts / points:** Stored in `USERS_TABLE.voicePracticeJson` map keyed by `wordId|date`. **API Gateway** sync limit is **29s**; client caps recording at **30s**.
- **Client:** `components/VoicePracticePanel.tsx` on Today tab; **web** shows a short notice (no mic pipeline in v1).

## Revision history

| Date | Change |
|------|--------|
| (draft) | Initial requirements from product request |
| 2026-04 | Implemented POST /voice-practice, Today tab hold-to-speak, Terraform route |
