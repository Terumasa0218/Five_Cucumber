// Lightweight availability checks for shared store backends (KV-first). No secrets are printed.

export async function isSharedStoreAvailable(): Promise<boolean> {
  // KV（REST）があれば即OK（タイムアウト回避）
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) return true;

  // Vercel Redis（RESTスタイル）
  if (process.env.VERCEL_REDIS_URL && process.env.VERCEL_REDIS_TOKEN) return true;

  // TCP Redis via REDIS_URL: node-redis で ping
  if (process.env.REDIS_URL) {
    const { createClient } = await import('redis');
    try {
      const c = createClient({ url: process.env.REDIS_URL });
      c.on('error', () => {});
      await c.connect();
      await c.ping();
      await c.quit();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// Backward compatibility export (if any old import remains)
export const isRedisAvailable = isSharedStoreAvailable;


