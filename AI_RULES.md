# AI Rules for Five_Cucumber

These rules define the mandatory operating contract for any AI coding agent working in this repository.

## Canonical Repository

The canonical repository is:

```text
https://github.com/Terumasa0218/Five_Cucumber
```

Treat the GitHub repository, especially `origin/main`, as the most accurate source of truth. Local working copies should be checked against the remote before important planning, implementation, or documentation changes when network access is available.

## Current Technical Direction

- Primary target: Web version.
- Framework: Next.js.
- Primary language: TypeScript / TSX.
- Package manager: pnpm.
- Monorepo tooling: Turborepo.
- Main app area: `apps/hub/`.
- Shared packages: `packages/`.
- Game module area: `games/cucumber5/`.
- Backend and integration areas: `functions/`, Firebase configuration, Ably / shared-store diagnostics where already present.

Unity and Blender are deferred. Do not use, add, or configure Unity or Blender until the Web version is complete or the user explicitly requests a direction change. If future quality goals suggest Unity or Blender, discuss the tradeoff first and record the decision before implementation.

## 1. Scope Boundary

Repository work should stay inside this repository and its subdirectories. Runtime-provided assistant instructions or connector metadata may be read only when required by the active tool environment, but project inspection and file edits should be limited to this repository.

Allowed repository areas include:

- `AGENTS.md`
- `AI_RULES.md`
- `WORKFLOW.md`
- `PLAN.md`
- `README.md`
- `DEPLOYMENT.md`
- `docs/`
- `.github/workflows/`
- `app/`
- `apps/`
- `assets/`
- `games/`
- `packages/`
- `functions/`
- `homeUI/`
- `homeUI_v0/`
- `scripts/`
- `tests/`
- `tooling/`
- package and build configuration files at the repository root
- Git metadata for normal non-destructive status, diff, add, commit, branch, fetch, pull, and push operations

The AI agent must not inspect or modify unrelated projects, user home content outside this repository, credential stores, browser profiles, SSH keys, system directories, OS settings, registry entries, global package manager settings, or global editor settings.

## 2. Required Startup Checklist

Before making changes, the AI agent must:

1. Read `AGENTS.md` if present.
2. Read `AI_RULES.md`.
3. Read `WORKFLOW.md` if present.
4. Read `PLAN.md` if present.
5. Read `README.md`, `docs/product-spec.md`, `docs/work-plan.md`, and `docs/rules/cucumber5.md` when the task affects product behavior, implementation direction, gameplay, deployment, or validation.
6. Confirm the current working directory is the repository root.
7. Confirm the canonical remote with `git remote -v`.
8. Run `git status --short`.
9. Identify the files it expects to change.
10. Avoid touching unrelated files.

## 3. Default Delivery Policy

Unless the user explicitly says `議論のみ`, `相談のみ`, says not to commit, or says not to push, repository changes should be completed through:

1. focused edits,
2. validation,
3. Git commit,
4. push to a dated branch,
5. pull request creation or update with `YYYY-MM-DD HH:mm JST` in the title,
6. merge into `main`,
7. local `main` synchronization.

Pull request titles must include date, time, and `JST` in `YYYY-MM-DD HH:mm JST` format so rollback points are easy to identify.

Direct pushes to `main` require explicit user instruction unless a repository intentionally does not use pull requests. Force pushing is prohibited.

Work must follow the phase-based review flow in `WORKFLOW.md`: finish a phase, push it, report it, and wait for user confirmation before starting the next phase.

If authentication, branch protection, CI, or repository permissions prevent push, PR creation, merge, or synchronization, stop at a clean boundary and report the blocker.

## 4. Tool Execution Restrictions

Prefer commands documented in `docs/ai-assisted-development-setup.md` and scripts already defined in `package.json`.

Allowed command categories:

- `git status`, `git diff`, `git diff --check`, `git add`, `git commit`, `git branch`, `git switch`, `git log`, `git fetch`, `git pull`, `git remote`, `git rev-parse`, `git push`
- `pnpm` scripts already defined by this repository
- repository-local scripts under `scripts/` and `tooling/`
- browser checks against local development servers when validating UI work
- GitHub connector or GitHub CLI operations for repository PR workflows when available

Prohibited command categories:

- `sudo`
- force pushing
- destructive history rewriting
- `git reset --hard` unless explicitly requested by the user
- `git rebase` unless explicitly requested by the user
- `git commit --amend` unless explicitly requested by the user
- deleting untracked repository content without explicit user approval
- recursive destructive shell commands outside generated build/cache directories
- network downloads or package installs without explicit user approval
- commands that read or write outside the repository root, except active tool-environment instruction files required by the assistant runtime

## 5. Web Project Rules

- Keep the Web version as the active product target until the user changes direction.
- Prefer changes inside `apps/hub/`, `games/cucumber5/`, `packages/`, `functions/`, `assets/`, or `docs/` according to the task.
- Use existing Next.js, TypeScript, pnpm, and Turborepo patterns.
- Prefer focused tests or checks that match the touched area.
- For UI changes, run an appropriate local validation and browser check when dependencies and environment allow it.
- Do not introduce a separate engine, renderer, or asset pipeline without prior discussion.

## 6. Unity and Blender Rules

Unity and Blender are future options, not current implementation tools.

Do not add Unity projects, Blender files, generated 3D exports, Unity scripts, Blender scripts, or engine-specific build pipelines during Web-version work.

Revisit Unity or Blender only after the Web version is complete or when the user explicitly asks to discuss it. A future proposal should explain:

- what problem Web technologies cannot solve well enough,
- whether Blender asset generation alone is sufficient,
- whether Unity is needed as a separate edition or prototype,
- expected repository layout,
- validation and rollback plan.

## 7. Git Rules

Branch names must include an ISO date in `YYYY-MM-DD` format.

Recommended branch pattern:

```text
ai/YYYY-MM-DD-short-description
```

Commit rules:

- Commit focused, reviewable changes.
- Include a clear prefix such as `docs:`, `tools:`, `web:`, `gameplay:`, `ui:`, `test:`, `fix:`, or `pipeline:`.
- Review `git diff` and run `git diff --check` before every commit.
- Push the dated branch unless the user requested discussion only or asked not to push.
- Use dated pull request titles, such as `2026-05-15 12:34 JST: docs add workflow policy`.
- Merge completed phase work into `main` and synchronize local `main`.

Prohibited Git operations:

- `git push --force`
- `git push --force-with-lease`
- `git reset --hard` unless explicitly requested by the user
- `git rebase` unless explicitly requested by the user
- `git commit --amend` unless explicitly requested by the user
- filtering or rewriting history

## 8. Rollback Requirements

Every AI task must preserve rollback capability:

- Use Git commits as restore points.
- Prefer adding new generated files over overwriting hand-authored assets.
- Document generated asset sources and commands.
- Keep terminal commands reproducible.

Preferred rollback methods:

```bash
git status --short
git log --oneline --max-count=10
git revert <commit-sha>
```

## 9. Human Approval Policy

The AI agent should behave conservatively:

- Explain planned changes before large refactors.
- Prefer small diffs.
- Never assume destructive cleanup is acceptable.
- Require user approval before deleting or replacing valuable assets.
- Treat user-created art, screens, documents, and game logic as protected unless explicitly instructed otherwise.
