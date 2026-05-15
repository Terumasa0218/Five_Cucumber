# Agent Instructions for Five_Cucumber

These instructions are the entry point for AI coding agents working in this repository.

## Required Reading Order

Before changing files, read these documents when they exist:

1. `AGENTS.md`
2. `AI_RULES.md`
3. `WORKFLOW.md`
4. `PLAN.md`
5. `README.md`
6. Relevant documents under `docs/`

If the work affects gameplay, room flow, deployment, realtime state, or UI behavior, read the matching local docs and nearby source files before editing.

## Current Direction

Five_Cucumber is a Web-first project. The active implementation target is the Next.js / TypeScript / Firebase web application in this repository.

Unity and Blender are not part of the active implementation workflow until the Web version is complete or the user explicitly changes direction. They may be discussed as future tools for higher-fidelity visuals, 3D assets, animation, or a separate Unity edition, but do not introduce Unity or Blender files, scripts, exports, or project setup during normal Web work.

## Collaboration Mode

If the user says `議論のみ`, `相談のみ`, or clearly asks only to discuss, do not edit files, commit, push, create pull requests, or merge. In that mode, inspect only what is needed, summarize findings, and ask or answer questions.

When the user says `作業開始` or otherwise asks for implementation, follow `WORKFLOW.md` and `AI_RULES.md`.

## Default Work Style

- Keep changes focused and reviewable.
- Prefer existing project patterns over new abstractions.
- Do not touch unrelated files.
- Preserve rollback points with commits.
- Use dated branches and dated pull request titles.
- Merge completed phases into `main` unless the user explicitly asks to stop before merge.
- Stop after each completed phase and wait for the user's confirmation before starting the next phase.
