// Lightweight availability checks for Redis backends. No secrets are printed.

export async function isRedisAvailable(): Promise<boolean> {
  // Fast-path: REST-style envs present
  const hasVercelRedisRest = !!process.env.VERCEL_REDIS_URL && !!process.env.VERCEL_REDIS_TOKEN;
  const hasUpstashRest = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
  if (hasVercelRedisRest || hasUpstashRest) return true;

  // TCP via REDIS_URL: attempt a quick ping using node-redis if available
  const url = process.env.REDIS_URL;
  if (!url) return false;
  try {
    // lazy require to avoid bundling errors if not installed in certain envs
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require('redis');
    const client = createClient({ url, socket: { reconnectStrategy: () => 0, connectTimeout: 1500 } });
    await client.connect();
    const pong = await client.ping();
    await client.quit();
    return typeof pong === 'string' && pong.toUpperCase().includes('PONG');
  } catch {
    return false;
  }
}


