# Five_Cucumber

Five_Cucumber is a Web-first implementation of the card game "5本のきゅうり".

The current product target is the Next.js / TypeScript web app in `apps/hub/`. Unity and Blender are deferred until the Web version reaches a clear completion point or the user explicitly changes direction.

## Current Canonical Docs

Use these documents as the current source of truth:

- `AGENTS.md` - AI entry instructions and required reading order
- `AI_RULES.md` - mandatory operating rules for AI work
- `WORKFLOW.md` - phase-based collaboration workflow
- `PLAN.md` - active priorities and open decisions
- `docs/product-spec.md` - current product specification
- `docs/work-plan.md` - implementation phases and task order
- `docs/rules/cucumber5.md` - game rule specification
- `docs/friend-match-sync.md` - friend-room synchronization strategy
- `docs/local-playability.md` - local backend fallback and server-sync behavior

Older investigation notes, legacy flow descriptions, and `.docx` proposal files remain as historical reference only. When they conflict with the canonical docs above, follow the canonical docs.

## Product Direction

The active Web MVP is:

1. Home screen
2. Player setup by nickname
3. CPU match
4. Friend room creation and joining
5. Friend match play
6. Rules screen
7. Deployment diagnostics for Firebase / KV / Redis / Ably where already present

The public online random-match mode is not part of the current MVP. It may be revisited after CPU and friend matches are stable.

## Game Rule Baseline

The game uses the implementation-tested deck:

- Cards: numbers `1` through `15`
- Copies: `7` copies of each number
- Total deck size: `105` cards
- Players: `2` to `6`
- Initial hand: `7` cards per player
- Objective: avoid reaching the configured cucumber limit

See `docs/rules/cucumber5.md` for the detailed rule contract.

## Repository Layout

```text
apps/hub/          Next.js app, routes, API handlers, UI, game integration
packages/          shared SDK, UI, metrics packages
games/cucumber5/   game module package
functions/         Firebase Functions area
assets/            source visual assets
docs/              product, workflow, deployment, UX, and rule documents
scripts/           repository-local diagnostics
tooling/           repository-local checks
tests/             root-level Playwright tests
```

## Main Routes

```text
/                         redirects to /home
/home                     home screen
/setup                    nickname setup
/cucumber/cpu/settings    CPU match settings
/cucumber/cpu/play        CPU match play
/friend                   friend match entry
/friend/create            friend room creation
/friend/join              friend room joining
/friend/room/[roomId]     friend waiting room
/friend/play/[roomCode]   friend match play
/rules                    simple rules page
/rules/cucumber5          game-specific rules page
/online                   future public online mode placeholder
```

Legacy generic routes under `/play/[gameId]` and `/lobby/[gameId]` are not the current MVP path unless a future phase explicitly revives them.

## Quick Start

Prerequisites:

- Node.js `18+`
- pnpm `9.0.0+`

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Start the hub app:

```bash
pnpm --filter @five-cucumber/hub dev
```

Open:

```text
http://localhost:3000
```

## Validation

Use the smallest relevant check first, then broaden as needed.

```bash
pnpm -w run assets:exists
pnpm -w run vercel:check
pnpm -w run type-check
pnpm -w run test
pnpm -w run build
```

For documentation-only changes:

```bash
git diff --check
```

## Environment Notes

CPU play and local profile setup should work without Firebase Admin, KV, Redis, or Ably. Friend rooms use a localStorage review mode when server sync is disabled, but real multi-device friend matches require authenticated requests and a shared store.

Friend room APIs currently depend on authenticated requests and a shared store for full server-side operation. Relevant environment areas include:

- `NEXT_PUBLIC_FIREBASE_*`
- Firebase Admin credentials for server token verification
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` or equivalent shared-store variables
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
- `ABLY_API_KEY`
- `NEXT_PUBLIC_HAS_SHARED_STORE`
- `NEXT_PUBLIC_USE_SERVER`

See `docs/deploy/` and `docs/ai-assisted-development-setup.md` for operational details.
See `docs/local-playability.md` for the expected local fallback behavior.

## Development Policy

Implementation work should follow the phase workflow:

1. discuss or confirm the phase,
2. create a dated branch,
3. make focused changes,
4. validate,
5. commit and push,
6. open or update a dated PR,
7. merge into `main`,
8. sync local `main`,
9. stop and wait for user confirmation.

If the user says `議論のみ` or `相談のみ`, do not edit files, commit, push, create PRs, or merge.
