type VercelKvClient = typeof import('@vercel/kv').kv;

const sharedStoreEnvPairs = [
  ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
  ['UPSTASH_KV_REST_URL', 'UPSTASH_KV_REST_TOKEN'],
  ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  ['VERCEL_REDIS_URL', 'VERCEL_REDIS_TOKEN'],
] as const;

let kvClient: VercelKvClient | null = null;

export const kvTTL = 60 * 60; // 1h default
export const roomTTL = 60 * 60 * 2; // 2h
export const gameTTL = 60 * 60 * 2; // 2h

function getSharedStoreEnvPair(): { url: string; token: string } | null {
  for (const [urlKey, tokenKey] of sharedStoreEnvPairs) {
    const url = process.env[urlKey];
    const token = process.env[tokenKey];
    if (url && token) return { url, token };
  }
  return null;
}

export function hasSharedStoreConfig(): boolean {
  return getSharedStoreEnvPair() !== null;
}

export function getSharedStoreDiagnostics() {
  return {
    sharedConfigured: hasSharedStoreConfig(),
    flags: {
      kv: Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
      upstashKv: Boolean(process.env.UPSTASH_KV_REST_URL && process.env.UPSTASH_KV_REST_TOKEN),
      upstashRedis: Boolean(
        process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
      ),
      vercelRedis: Boolean(process.env.VERCEL_REDIS_URL && process.env.VERCEL_REDIS_TOKEN),
    },
  };
}

function normalizeKvEnvironment(): void {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) return;

  const pair = getSharedStoreEnvPair();
  if (!pair) return;

  if (!process.env.KV_REST_API_URL) process.env.KV_REST_API_URL = pair.url;
  if (!process.env.KV_REST_API_TOKEN) process.env.KV_REST_API_TOKEN = pair.token;
}

export async function getKvClient(): Promise<VercelKvClient> {
  normalizeKvEnvironment();
  if (!hasSharedStoreConfig()) throw new Error('no-shared-store');
  if (!kvClient) {
    kvClient = (await import('@vercel/kv')).kv;
  }
  return kvClient;
}

export const kv = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === 'then') return undefined;
      return async (...args: unknown[]) => {
        const client = await getKvClient();
        const member = (client as unknown as Record<PropertyKey, unknown>)[prop];
        if (typeof member !== 'function') return member;
        return member.apply(client, args);
      };
    },
  },
) as VercelKvClient;

export async function kvSaveJSON(key: string, value: unknown, ttlSec = kvTTL) {
  const client = await getKvClient();
  await client.set(key, value, { ex: ttlSec }); // binary-safe JSON
}

export async function kvGetJSON<T = unknown>(key: string): Promise<T | null> {
  const client = await getKvClient();
  return (await client.get<T>(key)) ?? null;
}

export async function kvExists(key: string) {
  const client = await getKvClient();
  return (await client.exists(key)) > 0;
}

export async function kvExpire(key: string, ttlSec: number) {
  const client = await getKvClient();
  await client.expire(key, ttlSec);
}
