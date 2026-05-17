# Five_Cucumber Work Plan

This document defines the proposed implementation phases for the Web version. Each phase should be completed through the repository workflow in `WORKFLOW.md`.

## Phase 0: Documentation Reset

Goal: replace old working assumptions with current canonical documents.

Tasks:

- Rewrite `README.md` as the current project entry point.
- Add `docs/product-spec.md`.
- Add this `docs/work-plan.md`.
- Update `docs/rules/cucumber5.md` to the 105-card implementation baseline.
- Update `PLAN.md` to point at the new phase order.
- Mark older investigation and proposal documents as historical reference rather than current instructions.

Validation:

- `git diff --check`
- Review changed Markdown for route, rule, and scope consistency.

## Phase 1: Local Playability Baseline

Goal: make the local Web app predictable for development and review.

Tasks:

- Decide and document the local behavior when Firebase Admin or KV is missing.
- Ensure `/setup`, `/home`, `/cucumber/cpu/settings`, and `/cucumber/cpu/play` form a reliable local flow.
- Make user-facing error messages clear when friend-room backend requirements are not met.
- Reduce confusing debug output in normal user paths.

Validation:

- CPU flow browser check.
- Relevant unit tests.
- `pnpm -w run type-check` where feasible.

## Phase 2: CPU Match MVP

Goal: make CPU match the first complete playable mode.

Tasks:

- Align runtime, tests, and docs on the 105-card rule baseline.
- Verify 2 to 6 player CPU matches.
- Verify final trick behavior, `1` doubling, all-ones zero penalty, tie winner, and discard behavior.
- Add or update tests around any missing rule cases.
- Polish CPU game-over and return-to-home behavior.

Validation:

- `pnpm --filter @five-cucumber/hub test`
- Targeted browser check for CPU settings and CPU play.
- `pnpm -w run build` before phase completion if code changed broadly.

## Phase 3: Friend Match MVP

Goal: make friend-room play reliable enough for real users.

Tasks:

- Confirm the server-source-of-truth strategy: KV, Redis, polling, Ably, or a combination.
  - Phase 3 MVP decision: room metadata lives in shared KV, game updates go through the friend game API, clients poll authoritative snapshots, and Ably is optional acceleration.
- Verify room creation, join, waiting room, start, play, and game-over flow with two browser sessions.
- Ensure room IDs, copy text, and validation all use the same 6-digit rule.
- Clarify host-only actions and non-host behavior.
- Add tests around room API edge cases and room lifecycle.

Validation:

- Two-browser manual flow.
- API unit tests where practical.
- Shared-store diagnostic checks.

## Phase 4: Route and Test Cleanup

Goal: remove confusion from legacy paths and stale tests.

Tasks:

- Decide whether `/play/[gameId]` and `/lobby/[gameId]` should be removed, redirected, or revived later.
- Update root Playwright tests to current routes and current UI.
- Remove references to nonexistent `/stats`, `/settings`, `/auth/login`, old modal behavior, and old 5-digit room codes from current docs.
- Keep historical docs marked as reference only.

Validation:

- Updated Playwright smoke tests.
- `pnpm -w run test`
- `pnpm -w run type-check`

## Phase 5: UI and Accessibility Polish

Goal: make the app feel coherent and usable on desktop and mobile.

Tasks:

- Decide whether to formally add Tailwind or replace utility classes with existing CSS/CSS modules.
- Check mobile layout for home, setup, CPU settings, CPU play, friend pages, and rules pages.
- Add keyboard and focus-state improvements for card play and settings.
- Improve reduced-motion handling.
- Unify Japanese and English copy where the app exposes language switching.

Validation:

- Desktop and mobile browser screenshots.
- Keyboard-only smoke check.
- Console/error overlay check.

## Phase 6: Production Readiness

Goal: make deployment and operation repeatable.

Tasks:

- Finalize Vercel environment variable documentation.
- Confirm Firebase Admin setup for server token verification.
- Confirm KV / Redis and Ably setup.
- Ensure diagnostics do not leak secrets.
- Run production-like smoke checks.

Validation:

- `pnpm -w run build`
- `pnpm -w run vercel:check`
- `pnpm -w run assets:exists`
- Production URL smoke check when available.

## Phase Gate

Do not start a later phase until the previous phase has been reported, merged, synchronized to local `main`, and approved by the user unless the user explicitly changes the order.
