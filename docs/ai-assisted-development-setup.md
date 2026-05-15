# AI-Assisted Development Setup

This document lists repository-local commands AI agents may use when validating work in Five_Cucumber.

## Startup Checks

Run these before changing files:

```bash
git remote -v
git status --short
git branch --show-current
```

Use `git fetch origin main` before important planning or implementation work when network access is available.

## Dependency Policy

Do not install or update dependencies without explicit user approval.

If dependencies are already installed, use the repository scripts below. If dependencies are missing and validation requires them, report that clearly and ask before running package installation.

The CI workflow currently installs dependencies with:

```bash
pnpm install --no-frozen-lockfile
```

## General Validation

For documentation-only changes:

```bash
git diff --check
```

For code changes, choose the smallest relevant checks first, then broaden when the touched area is shared or risky:

```bash
pnpm -w run format:check
pnpm -w run lint
pnpm -w run type-check
pnpm -w run test
pnpm -w run build
```

For deployment-oriented changes:

```bash
pnpm -w run vercel:check
pnpm -w run assets:exists
```

For Ably or shared-store diagnostics:

```bash
pnpm -w run check:ably
pnpm -w run check:store
```

## Local Web Validation

When dependencies are available and UI work needs browser verification:

```bash
pnpm -w run dev
```

Then verify the affected page in a browser. Check for visible layout issues, broken navigation, and console errors.

## Git Validation Before Commit

Before every commit:

```bash
git diff
git diff --check
git status --short
```

Stage only intended files.

## Safety Notes

- Do not print secrets, tokens, or private environment values.
- Do not run destructive cleanup unless the user explicitly approves it.
- Do not force push.
- Do not rewrite history unless the user explicitly asks for that operation.
