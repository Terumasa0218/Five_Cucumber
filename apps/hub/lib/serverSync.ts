// Centralized server-sync capability detection (Server vs Browser aware)

const isBrowser = typeof window !== 'undefined';

// Server-side detection (secrets available only on the server)
export const hasKV =
  !!process.env.KV_REST_API_URL ||
  !!process.env.KV_URL ||
  !!process.env.UPSTASH_KV_REST_URL;

export const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL ||
  !!process.env.REDIS_URL;

// Public flags (embedded into client bundle when defined)
const publicUseServer = (process.env.NEXT_PUBLIC_USE_SERVER === '1' || process.env.NEXT_PUBLIC_USE_SERVER === 'true');
const publicHasShared = (process.env.NEXT_PUBLIC_HAS_SHARED_STORE === '1' || process.env.NEXT_PUBLIC_HAS_SHARED_STORE === 'true');

// HAS_SHARED_STORE: server → real detection, browser → public hint
export const HAS_SHARED_STORE = isBrowser ? publicHasShared : (hasKV || hasRedis);

// USE_SERVER_SYNC:
// - In browser: enable if explicitly forced, or if public shared-store hint is true
// - On server: enable if forced, or actual shared store is present
export const USE_SERVER_SYNC = isBrowser
  ? (publicUseServer || publicHasShared)
  : (publicUseServer || hasKV || hasRedis);


