# Five_Cucumber Work Flow

This document defines the working flow for Five_Cucumber. It should be used as the default collaboration pattern in this repository unless the user gives different instructions or a stronger local rule applies.

## Core Rule

Work should be divided into phases. A phase is a user-reviewable milestone with a clear outcome.

Do not continue from one phase to the next until:

1. the phase work has been committed and pushed,
2. a pull request or equivalent merge point has been created with a `YYYY-MM-DD HH:mm JST` title marker,
3. the work has been merged into `main`,
4. local `main` has been synchronized with `origin/main`,
5. the work report has been provided,
6. the user has checked the result,
7. the user says the phase is OK or gives the next instruction.

## Discussion-Only Mode

If the user says `議論のみ`, `相談のみ`, or clearly asks only to discuss, do not edit files, commit, push, create pull requests, or merge.

In discussion-only mode:

- inspect only if needed,
- summarize findings,
- ask or answer questions,
- do not change repository state.

## Phase Flow

Each phase should follow this flow:

1. Confirm current Git state and the canonical remote.
2. Create or use a dated working branch.
3. Break the phase into smaller tasks.
4. Implement one task at a time.
5. Validate the task.
6. Commit and push at task boundaries when useful.
7. Finish the full phase.
8. Validate the phase.
9. Commit and push the phase result.
10. Create or update a pull request with date, time, and `JST` in the title.
11. Merge the pull request into `main`.
12. Synchronize local `main` with `origin/main`.
13. Report what changed, what was validated, the PR, and the final `main` commit.
14. Stop and wait for user confirmation before starting the next phase.

Recommended branch pattern:

```text
ai/YYYY-MM-DD-short-description
```

## Task Flow Inside a Phase

Tasks inside a phase do not require user confirmation before continuing, but they should still preserve rollback points.

For each meaningful task:

1. keep the change focused,
2. validate the change,
3. commit with a clear message,
4. push the branch,
5. include date and time in the commit message, pull request, or update note when it helps identify a rollback point.

This makes it possible to return to a known-good point if the user reviews the final phase result and says it is not acceptable.

## Rollback Requirement

Every phase and meaningful task should leave Git restore points.

Preferred rollback methods:

- revert a commit,
- return to a previous pushed branch commit,
- create a corrective commit.

Avoid destructive history operations. Do not force push. Do not use `git reset --hard` unless the user explicitly requests it.

## User Review Gate

After each phase:

- stop work,
- report the pushed branch and task commit,
- report the pull request or merge point with `YYYY-MM-DD HH:mm JST` in its title,
- report the final `main` commit,
- summarize validation,
- tell the user what to check,
- wait for the user's OK or correction request before starting the next phase.

Merging into `main` is part of the default phase completion flow. Do not stop at push or PR creation unless the user explicitly asks you to stop there. Do not start the next phase on your own.

## Specification Uncertainty Gate

The specifications are expected to evolve. If implementation reveals that a spec is missing, ambiguous, contradictory, or likely wrong, stop at a clean boundary.

When this happens:

1. finish or revert any partial task so the repository is coherent,
2. commit and push useful completed work if any,
3. report the uncertainty,
4. ask the user what direction to take,
5. treat the next step as discussion unless the user explicitly resumes implementation.

This applies even in the middle of a phase.

## Push and Pull Request Policy

Default behavior:

- commit and push unless the user says discussion only or says not to push,
- push to a dated branch,
- create or update a pull request,
- include date, time, and `JST` in the pull request title,
- merge the work into `main`,
- synchronize local `main` after merge,
- do not push directly to `main` unless explicitly asked or unless a repository intentionally does not use pull requests,
- do not force push.

Pull request titles must include date, time, and `JST` so the user can easily identify rollback points.

Recommended title pattern:

```text
YYYY-MM-DD HH:mm JST: short description
```

Example:

```text
2026-05-15 12:34 JST: docs add workflow policy
```

Merging into `main` is part of the normal completion flow. If the user wants review before merge for a specific task, they should say so explicitly. After merge, synchronize local `main` and report the final `main` commit.

## Web-First Direction

Five_Cucumber should remain Web-first until the Web version is complete or the user explicitly changes direction.

Default implementation work should use the existing Next.js / TypeScript / Firebase / pnpm / Turborepo stack. Unity and Blender should not be introduced during normal Web work.

Unity and Blender may be revisited later for:

- high-fidelity 3D assets,
- richer animation or promotional visuals,
- a separate Unity edition,
- asset generation where Blender output clearly improves the Web experience.

Before using Unity or Blender, discuss the reason, repository layout, validation plan, and rollback strategy with the user.

## Cross-Chat and Cross-Repository Use

Use this workflow as the default in future chats for this repository when the user is asking for implementation work.

If another repository has its own `AGENTS.md`, `WORKFLOW.md`, `AI_RULES.md`, or stronger local instructions, follow that repository's rules first and adapt this workflow only where it does not conflict.

If a future chat does not include this file in context, the user may point the agent back to this workflow or ask to copy it into that repository.
