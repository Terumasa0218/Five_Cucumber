# Friend Match Synchronization

This document records the Phase 3 MVP synchronization strategy for friend-room matches.

## Source of Truth

Friend matches use server-side API routes as the gameplay authority.

- Room metadata is stored under `friend:room:<6-digit-room-id>` in the shared KV store.
- Game snapshots are written by the friend game API after host initialization and each accepted move.
- Clients poll the game API for authoritative state updates.
- Ably is an optional room-update accelerator. Polling remains the required fallback.

The browser `localStorage` room store is only a local review mode for room creation, joining, and waiting-room UI. It is not a real multi-device match store, and local review rooms cannot start friend gameplay.

## Room ID Rule

Friend room IDs are exactly six digits.

- Create API generates six digits.
- Join UI strips non-digits and caps input at six digits.
- Room, join, status, leave, and game APIs reject malformed IDs.

## Authority Checks

The server checks room membership before game actions.

- Only the host seat can start a waiting room.
- Starting requires all seats to be filled.
- Only the host can initialize the game snapshot.
- A move is accepted only when the submitted nickname matches the move player's seat.

These checks currently use the room nickname/seat model already present in the app. Firebase auth still gates server API access, but seat authorization for this MVP is based on room membership.

## Required Environment

Real friend matches require:

- Firebase client configuration for anonymous sign-in.
- Firebase Admin configuration for API token verification.
- KV shared-store credentials.
- `NEXT_PUBLIC_HAS_SHARED_STORE=true` or `NEXT_PUBLIC_USE_SERVER=true` when the client should use server synchronization.
- `ABLY_API_KEY` only when realtime room update events are desired.

Without these, the app should show a clear backend requirement message instead of starting a broken match.
