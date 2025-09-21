// Centralized server-sync capability detection

export const hasKV =
  !!process.env.KV_REST_API_URL ||
  !!process.env.KV_URL ||
  !!process.env.UPSTASH_KV_REST_URL;

export const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL ||
  !!process.env.REDIS_URL;

export const HAS_SHARED_STORE = hasKV || hasRedis;

// Default: use server sync only when a shared store is available.
// To force-enable, set NEXT_PUBLIC_USE_SERVER=1
export const USE_SERVER_SYNC =
  (process.env.NEXT_PUBLIC_USE_SERVER === '1' ? true : HAS_SHARED_STORE);


