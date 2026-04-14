# CI/CD, Terraform, and secrets

This document is the **single place** for how builds, infrastructure, and credentials are split in this repo.

## Boundaries

| Concern | Where it runs | Purpose |
|--------|----------------|---------|
| **App CI** | `.github/workflows/ci.yml` | `npm ci`, lint, typecheck on push/PR to `main` |
| **Packages / deploy** | `.github/workflows/build-packages.yml` | Manual (`workflow_dispatch`): Expo web export, optional S3, EAS Android |
| **Terraform** | **Not** in Build Packages | Infra changes: run locally or use `.github/workflows/terraform.yml` (validate only in CI) |
| **Runtime API keys** | **AWS Secrets Manager** | LLM keys (e.g. JSON with `groq`, `openai`) — Lambdas read at runtime |

**Build Packages does not apply Terraform.** Changing API Gateway, Lambdas as managed by Terraform, or secrets **infrastructure** still belongs to Terraform / your deploy script, not the Expo workflow.

## What goes where

### GitHub Actions secrets / variables

Used for **CI and client build-time config** that is safe to expose to the build (Expo public env) or for **AWS access from GitHub** (S3 sync, EAS):

- **Expo public (not secret server keys):** `EXPO_PUBLIC_USER_POOL_ID`, `EXPO_PUBLIC_USER_POOL_CLIENT_ID`, `EXPO_PUBLIC_OAUTH_DOMAIN`, `EXPO_PUBLIC_API_ENDPOINT` — these are embedded in the web/mobile bundle; they identify your Cognito app and API URL, not your LLM master keys.
- **EAS / Expo:** `EXPO_TOKEN`, `EAS_PROJECT_ID` (Android job).
- **Optional S3 web deploy:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_WEB_BUCKET`; repo variable `ENABLE_S3_DEPLOY`, optional `AWS_REGION`, `AWS_S3_PREFIX`.

**Do not** put LLM provider API keys intended only for Lambdas into `EXPO_PUBLIC_*` or commit them in the repo.

### AWS Secrets Manager

- Secret created/managed by Terraform (e.g. `llm-api-keys` / `{name_prefix}-llm-api-keys` pattern in `terraform/modules/secrets`).
- JSON fields such as `groq`, `openai` — see backend and Lambda code for exact keys.
- Terraform uses `lifecycle { ignore_changes = [secret_string] }` so **values** are updated outside Terraform (CLI/scripts) without drift fights.

### Local `.env` (gitignored)

- Copy from **`.env.example`** at repo root.
- Used for local dev and for scripts like `backend`’s `sync-openai-secret` (merges `OPENAI_API_KEY` into the shared LLM secret). **Never commit `.env`.**

## Workflows (reference)

1. **`ci.yml`** — Fast feedback on every PR/push to `main`.
2. **`build-packages.yml`** — Run when you want a web artifact and/or Android build; S3 deploy only if `ENABLE_S3_DEPLOY` is set and AWS secrets are configured.
3. **`terraform.yml`** — **`terraform fmt` / `init` / `validate`** on changes under `terraform/`; optional manual dispatch to re-run validation. **No `plan`/`apply` in CI** (no remote state in repo; plan/apply stay on a machine with `terraform.tfvars` and credentials, or extend later with backend + OIDC).

## Optional: GitHub OIDC → AWS (instead of long-lived keys)

For S3 deploy or future Terraform automation, prefer an **IAM role** trusted by GitHub OIDC over static `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in GitHub. Steps at a high level:

1. Create an IAM role with `sts:AssumeRoleWithWebIdentity` for `token.actions.githubusercontent.com`, scoped to this repo (and branch/environment if desired).
2. Attach policies for the minimum S3 (and/or Terraform) permissions.
3. In the workflow, use `aws-actions/configure-aws-credentials` with `role-to-assume: ${{ secrets.AWS_ROLE_ARN }}` (name as you prefer) and set `permissions: id-token: write`.

`build-packages.yml` still uses access keys today; migrating is optional and documented here for alignment with least-privilege practice.

## Related files

| File | Role |
|------|------|
| `.env.example` | Safe template for local env; no real secrets |
| `terraform/terraform.tfvars.example` | Template for Terraform variables |
| `backend/scripts/sync-openai-from-env.mjs` | Merge OpenAI key from `.env` into Secrets Manager |
| `scripts/README.md` | `sync-openai-secret` quick command |

## Runbook: new OpenAI key for voice practice

1. Set `OPENAI_API_KEY` in repo root `.env`.
2. Configure AWS CLI profile/credentials for the target account.
3. From `backend`: `npm run sync-openai-secret` (with `LLM_KEYS_SECRET_NAME` if your secret name differs). See `scripts/README.md`.
