---
name: deploy-github-expo
description: >-
  Stages needful changes, commits, pushes to GitHub, and triggers the Build Packages
  workflow (Expo web export + optional S3 deploy, EAS Android preview). Use when the
  user wants to deploy, release, ship web/Android, push to main, or run GitHub Actions
  build-packages after a commit.
---

# Deploy via GitHub (web + Android)

## Preconditions

- Working tree changes are intentional; **never** commit `.env`, keystores, or tokens. Confirm `.gitignore` covers secrets.
- **CI** (`.github/workflows/ci.yml`) runs on **push** and **pull_request** to **`main`**: `npm ci`, `lint`, `typecheck` if present.
- **Build Packages** (`.github/workflows/build-packages.yml`) runs only on **`workflow_dispatch`** (manual). It runs jobs **`build-web`** and **`build-android`** in parallel. Web deploy to S3 is gated by repo variable **`ENABLE_S3_DEPLOY`** and AWS secrets (see workflow comments).

## Checklist

```
- [ ] git status — only intended files; no secrets
- [ ] npm run lint && npx tsc --noEmit (or fix failures; CI uses typecheck --if-present)
- [ ] git add <paths>
- [ ] git commit -m "conventional message"
- [ ] git push origin <branch>
- [ ] If merging to main: open PR or push main (triggers CI)
- [ ] Trigger Build Packages (gh CLI or GitHub UI)
```

## 1. Verify and stage

```bash
git status
git diff
```

Stage **needful** sources only (e.g. `app/`, `lib/`, `backend/`, `test/`, `package.json`, workflows). Do **not** stage `payload.json` or env files unless the user explicitly wants them (they usually should not be committed).

## 2. Commit

Use a short, imperative subject; optional body for context.

Examples:

- `feat(profile): daily word reminder schedule`
- `fix(api): merge notification preferences on PUT`
- `chore(ci): tweak playwright fixtures`

## 3. Push

```bash
git push origin HEAD
# or
git push origin main
```

Pushing to **`main`** triggers **CI**. Feature branches: open a PR into `main` to run CI without deploying.

## 4. Trigger build + deploy (web + Android)

After the commit is on the branch GitHub should build from (usually **`main`**), start **Build Packages**:

**GitHub CLI** (authenticated: `gh auth login`):

```bash
gh workflow run "Build Packages" --ref main
```

Monitor:

```bash
gh run list --workflow="Build Packages" --limit 5
gh run watch
```

**Without `gh`:** Repo → **Actions** → **Build Packages** → **Run workflow** → choose branch → **Run workflow**.

## 5. What each job does (expectations)

| Job            | Purpose |
|----------------|---------|
| `build-web`    | `npm ci`, `npx expo export --platform web`, optional **S3 sync** if `ENABLE_S3_DEPLOY=true` and secrets set. |
| `build-android`| Syncs `EXPO_PUBLIC_*` secrets to EAS **preview**, then `eas build --platform android --profile preview`. Requires `EXPO_TOKEN`, `EAS_PROJECT_ID`, and Expo public secrets. |

If a job fails, open the run log in Actions; common issues are missing secrets or EAS project permissions.

## Optional: CI typecheck

`package.json` may not define `typecheck`; CI skips it with `--if-present`. Locally run:

```bash
npx tsc --noEmit
```

Consider adding `"typecheck": "tsc --noEmit"` to `package.json` so CI enforces types.

## Do not

- Commit `.env` or paste tokens into the skill or repo.
- Assume push to `main` alone runs **Build Packages** — it does **not**; always **workflow_dispatch** (or extend the workflow with `push` if the team decides that).
