---
name: spec-requirements
description: >-
  Authors and refines product/requirements markdown under spec/ (goals, UX, API
  contracts, non-goals, open questions, revision history). Use when writing or
  updating feature specs, requirements docs, VOICE_PRACTICE-style RFCs, or when
  the user asks to document behavior before implementation.
---

# Spec requirements & refinements

## Scope

Work inside **`spec/`** (prefer `spec/requirements/` for new requirement sets, `spec/documents/` for longer guides, `spec/features/README.md` as index). Keep **implementation code out** of requirements unless illustrating a JSON contract.

## Structure to use

1. **Title + status** — Draft | Approved | Deprecated.
2. **Goal** — One short paragraph.
3. **User experience** — numbered flows, platform notes (iOS/Android/web).
4. **Non-goals** — what v1 explicitly excludes.
5. **API / data** — endpoints at high level, storage shapes, secrets ownership.
6. **Contracts** — example JSON schemas or field lists.
7. **Edge cases** — limits, timeouts, permissions, failure states.
8. **Privacy / security** — retention, PII, keys.
9. **Testing** — what to automate vs manual.
10. **Open questions** — bullets for PM/engineering to close.
11. **Revision history** — date + one-line change.

## Refinement workflow

When the user asks to **refine** an existing spec:

1. Read the current file end-to-end.
2. Align terminology with **codebase** (grep app and `backend/` for real names: `wordId`, `practiceStatus`, `pointsTotal`, env vars).
3. Resolve or narrow **open questions** where possible; leave truly unknown items listed.
4. Avoid duplicating entire deployment docs—**link** to `spec/documents/` instead.
5. Keep the main body **under ~400 lines**; split appendices if needed.

## Index maintenance

When adding a **new** requirements doc:

- Add a row to **`spec/requirements/README.md`** or **`spec/features/README.md`** (whichever fits).
- Use a **stable filename**: `FEATURE_NAME_SHORT.md`, uppercase snake case for feature titles is fine.

## Do not

- Commit secrets, real API keys, or production URLs unless already public in repo.
- Promise specific library versions without checking `package.json`.
- Replace legal/privacy policy text—flag “needs legal review” instead.

## Quick template

```markdown
# Feature name

**Status:** Draft  
**Related:** [link](...)

## 1. Goal
...

## 2. User experience
...

## 3. Non-goals (v1)
...

## 4. API / backend (high level)
...

## 5. Contracts
...

## 6. Open questions
...

## Revision history
| Date | Change |
|------|--------|
```
