export function hasSharedStore(): boolean {
  const hasKV = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;
  const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
  const hasVercelRedisRest = !!process.env.VERCEL_REDIS_URL && !!process.env.VERCEL_REDIS_TOKEN;
  const hasTcpRedis = !!process.env.REDIS_URL;
  return hasKV || hasUpstash || hasVercelRedisRest || hasTcpRedis;
}


