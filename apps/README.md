# Apps

This repository keeps the Expo app at the repo root for now to avoid breaking
existing build tooling. The long-term target is to move the app into an `apps/`
workspace. Until then, treat the root as the web/mobile app entry point.

## Current app entry points
- `app/` (Expo Router screens)
- `app.json` / `app.config.ts` (Expo config)
- `package.json` (app dependencies)

