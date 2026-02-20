// Lightweight availability checks for shared store backends (KV-first). No secrets are printed.

export async function isSharedStoreAvailable(): Promise<boolean> {
  // KV（REST）があれば即OK（タイムアウト回避）
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) return true;

  // Vercel Redis（RESTスタイル）
  if (process.env.VERCEL_REDIS_URL && process.env.VERCEL_REDIS_TOKEN) return true;

  return false;
}

// Backward compatibility export (if any old import remains)
export const isRedisAvailable = isSharedStoreAvailable;
