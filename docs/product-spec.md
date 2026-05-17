# Five_Cucumber Product Spec

This document is the current product specification for the Web version. Older proposal documents and investigation notes are historical reference only.

## Product Goal

Build a playable Web version of "5本のきゅうり" that works first as a stable CPU match and then as a stable friend-room match.

## Active Scope

The active scope is Web-only:

- Next.js app in `apps/hub/`
- TypeScript / TSX
- pnpm / Turborepo
- Firebase client authentication where already present
- KV / Redis / Ably integrations where already present

Unity and Blender are deferred. They should not be introduced into the repository during Web-version implementation.

## Current MVP

### Included

- Home screen at `/home`
- Nickname setup at `/setup`
- CPU settings at `/cucumber/cpu/settings`
- CPU play at `/cucumber/cpu/play`
- Friend match entry at `/friend`
- Friend room creation at `/friend/create`
- Friend room join at `/friend/join`
- Friend waiting room at `/friend/room/[roomId]`
- Friend match play at `/friend/play/[roomCode]`
- Rules pages at `/rules` and `/rules/cucumber5`

### Deferred

- Public random online matching
- Rankings and analytics dashboard
- PWA and push notifications
- Monetization
- Tournament mode
- Spectator mode
- Unity edition
- Blender-generated production asset pipeline

## Game Rule Baseline

The implementation-tested rule baseline is canonical:

- Deck: 105 cards
- Card numbers: 1 through 15
- Copies: 7 copies per number
- Players: 2 to 6
- Initial hand: 7 cards per player
- Trick winner: highest card wins
- Tie winner: latest played highest card wins
- Normal follow rule: if a field card exists, a player may play a card equal to or higher than the current field card
- Discard house rule: if a field card exists, a player may instead discard the minimum card in their hand; discarded cards do not join winner determination
- Final trick: all players reveal/play their last card
- Cucumber value comes from the winning card's cucumber value
- If any played card in the final trick is `1`, the final trick penalty is doubled
- If every played final-trick card is `1`, the penalty is 0

See `docs/rules/cucumber5.md` for detailed wording.

## Web Completion Criteria

The Web version can be considered complete when all of these are true:

1. CPU match can be played from home to game over without manual recovery.
2. Friend match can be played by real users from room creation to game over.
3. Rules in docs, tests, and runtime behavior match.
4. Main routes render correctly on desktop and mobile.
5. Required environment variables and deployment steps are documented.
6. Current tests match current routes and critical user flows.
7. No known blocker remains for a normal user to play CPU and friend matches.

## Current Known Gaps

- Legacy docs and tests still mention old routes or old flow assumptions.
- Public online mode is only a placeholder.
- Friend match depends on authenticated API requests and shared store configuration.
- Generic `/play/[gameId]` and `/lobby/[gameId]` routes are legacy paths, not the current MVP flow.
- Some UI files still use Tailwind-style utility classes even though Tailwind is not configured as a project dependency.
- Debug logs and diagnostic surfaces need cleanup before production polish.

## Documentation Authority

When documents disagree, use this order:

1. `AGENTS.md`, `AI_RULES.md`, and `WORKFLOW.md` for AI operating rules.
2. `docs/product-spec.md` for product scope.
3. `docs/rules/cucumber5.md` for gameplay rules.
4. `docs/work-plan.md` and `PLAN.md` for task order.
5. Older `docs/` files and `.docx` files as historical context only.
