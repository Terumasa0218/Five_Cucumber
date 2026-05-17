# Local Playability Baseline

This document defines how the Web app should behave in a local development environment when Firebase Admin, KV, Redis, or Ably are not configured.

## Backend-Free Local Flow

The following routes must work without Firebase Admin or a shared store:

- `/setup`
- `/home`
- `/cucumber/cpu/settings`
- `/cucumber/cpu/play`

`/setup` validates the nickname in the browser first. If the server-side username reservation is unavailable because authentication or backend configuration is missing, the app saves a local-only profile in `localStorage` and continues. Server-side duplicate-name protection only applies when the username registration API is fully configured.

CPU play is a local mode. It must not require Firebase, KV, Redis, or Ably.

## Friend Room Local Mode

Friend rooms have two different behaviors:

- Local room review mode
- Server-synchronized friend match mode

When `NEXT_PUBLIC_USE_SERVER` and `NEXT_PUBLIC_HAS_SHARED_STORE` are unset or false, friend room create/join pages use browser `localStorage`. This is only for checking room creation, room joining, and the waiting-room UI in one browser profile. It is not a real multi-device friend match.

Starting an actual friend match requires server synchronization. In local room review mode, the waiting room should show a clear message instead of starting a broken match.

## Server-Synchronized Friend Match Requirements

For real friend-room play across users or devices, configure:

- Firebase client environment variables for browser sign-in.
- Firebase Admin credentials for server token verification.
- KV or Redis shared store credentials.
- `NEXT_PUBLIC_HAS_SHARED_STORE=true` or `NEXT_PUBLIC_USE_SERVER=true` when the client should use server synchronization.
- Ably credentials if realtime room updates are expected.

If server synchronization is enabled but authentication or shared-store settings are missing, the UI should say which backend requirement is missing instead of surfacing a generic network error.

## Debug Output

Normal local play should keep the browser console quiet. Verbose logs are opt-in:

- `NEXT_PUBLIC_DEBUG_GAME=1` enables CPU game debug logs.
- `NEXT_PUBLIC_DEBUG_ROOMS=1` enables room-system debug logs.
