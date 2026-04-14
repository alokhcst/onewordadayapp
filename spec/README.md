# Specification-driven development

This folder is the **single home for product specs, features, requirements, and related design notes**. Implementation work should trace back to a file here (or be followed by an update here).

## Layout

| Path | Contents |
|------|----------|
| **[requirements/](requirements/README.md)** | Formal / narrative requirements |
| **[features/](features/README.md)** | Feature specs and enhancements |
| **[documents/](documents/)** | Full library: architecture, deployment, OAuth, AI, ops guides, and historical fix notes |
| **[testing/](testing/word-repetition-regression.md)** | Test matrices and regression behavior specs |

## Workflow (spec → code)

1. **Change behavior** → update or add a spec under `spec/requirements/` or `spec/features/`, or extend a doc in `spec/documents/`.
2. **Implement** → link PRs/commits to the spec (filename or section).
3. **Automate checks** → add or extend tests under `test/playwright/` (or backend tests) and reference the spec in comments.

## Quick entry points

- [requirements.md](documents/requirements.md) — primary requirements
- [requirements2.md](documents/requirements2.md) — additional requirements
- [AI word generation](documents/AI_WORD_GENERATION.md)
- [Architecture flow](documents/ARCHITECTURE_FLOW_DIAGRAM.md)
- [CI/CD and secrets](documents/CI_CD_AND_SECRETS.md) — workflows, Terraform, GitHub vs AWS keys
- [Word repetition regression matrix](testing/word-repetition-regression.md)

The previous root folder `documents/` has been **moved** to `spec/documents/`. If you have old links, use `spec/documents/…` (or see [documents/README.md](../documents/README.md) at repo root).
