export function hasSharedStore(): boolean {
  // KV を最優先で検出
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) return true;
  // 他の方式（必要なら継続）
  if (process.env.VERCEL_REDIS_URL && process.env.VERCEL_REDIS_TOKEN) return true;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) return true;
  if (process.env.REDIS_URL) return true;
  return false;
}


