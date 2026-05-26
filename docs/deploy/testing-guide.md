# Deployment Smoke Test Guide

This guide covers the current Web MVP smoke checks for local and deployed environments.

## Setup

Local:

```bash
pnpm -w dev
```

Open `http://localhost:3000`.

Production:

- Use the latest deployed URL.
- Confirm required Firebase client variables are present.
- Confirm Firebase Admin and KV/Redis variables are present before testing real multi-device friend matches.

## Core Smoke Tests

### Home

1. Open `/home`.
2. Confirm the `5本のきゅうり` title is visible.
3. Confirm these links exist:
   - CPU match: `/cucumber/cpu/settings`
   - Friend match: `/friend/create`
   - Online placeholder: `/online`
   - Rules: `/rules`

### CPU Match

1. Open `/cucumber/cpu/settings`.
2. Select player count, time limit, cucumber limit, and CPU difficulty.
3. Start the match.
4. Confirm the app navigates to `/cucumber/cpu/play`.
5. Confirm the battle HUD, seats, and seven starting hand cards render.

### Friend Match

1. Open `/friend`.
2. Open `/friend/create`.
3. Create a room after setting a nickname when prompted.
4. Confirm the generated room code is six digits.
5. Open `/friend/join` in a second browser profile or device.
6. Join with the six-digit room code.
7. Confirm both players reach the waiting room.

When server sync is disabled or backend variables are missing, local review mode may create rooms only in the same browser storage. Real multi-device friend matches require Firebase authentication plus the shared store.

### Legacy Route Compatibility

1. Open `/play/cucumber5?mode=cpu&players=2&difficulty=easy`.
2. Confirm it redirects to `/cucumber/cpu/play` and maps `difficulty` to `cpuLevel`.
3. Open `/lobby/cucumber5?mode=friends`.
4. Confirm it redirects to `/friend`.
5. Open `/lobby/cucumber5?mode=public`.
6. Confirm it redirects to `/online`.

## Validation Commands

Use the smallest relevant command first, then broaden when needed:

```bash
pnpm -w run type-check
pnpm -w run test
pnpm -w run build
```

For root-level Playwright smoke tests:

```bash
pnpm exec playwright test tests/home.spec.ts tests/navigation.spec.ts tests/game.spec.ts --project=chromium
```

## Result Template

```text
Test time: YYYY-MM-DD HH:MM JST
Environment: local / production
Commit: <sha>

Home: pass / fail
CPU match: pass / fail
Friend match: pass / fail
Legacy redirects: pass / fail
Notes:
```
