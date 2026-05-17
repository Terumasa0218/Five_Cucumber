# Five_Cucumber Plan

This file records the active project direction for AI-assisted work.

## Active Direction

Five_Cucumber is Web-first.

Until the Web version is complete or the user explicitly changes direction, implementation should focus on:

- Next.js
- TypeScript / TSX
- pnpm
- Turborepo
- Firebase client authentication where already present
- KV / Redis / Ably integrations where already present

Unity and Blender remain deferred. Do not add Unity or Blender files during ordinary Web implementation.

## Current Canonical Documents

- `README.md`
- `docs/product-spec.md`
- `docs/work-plan.md`
- `docs/rules/cucumber5.md`
- `docs/friend-match-sync.md`
- `docs/deprecated-docs.md`
- `AGENTS.md`
- `AI_RULES.md`
- `WORKFLOW.md`
- `docs/ai-assisted-development-setup.md`

## Rule Baseline

The game rule baseline is now:

- 15 card numbers
- 7 copies of each number
- 105 total cards
- 7 initial cards per player

If any older document says 60 cards, 4 copies, 5-digit room codes, or old generic routes, treat it as historical unless it has been updated in a later phase.

## Phase Order

1. Documentation reset.
2. Local playability baseline.
3. CPU match MVP.
4. Friend match MVP.
5. Route and test cleanup.
6. UI and accessibility polish.
7. Production readiness.

See `docs/work-plan.md` for details.

## Near-Term Priority

Finish Phase 3 Friend Match MVP, then stop for user review before starting Phase 4.

## Open Decisions

- Define the exact review checklist for "Web version complete."
- Decide whether legacy generic `/play/[gameId]` and `/lobby/[gameId]` routes should be redirected, removed, or revived later.
- Decide whether UI should formally adopt Tailwind or move away from Tailwind-style utility classes.
- Decide whether future Blender use is asset-generation only or part of a larger 3D workflow.
- Decide whether Unity is ever a separate edition, a prototype, or unnecessary.
