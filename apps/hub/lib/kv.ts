import { kv } from '@vercel/kv';

export { kv };

export const kvTTL = 60 * 60; // 1h default

export async function kvSaveJSON(key: string, value: unknown, ttlSec = kvTTL) {
  await kv.set(key, value, { ex: ttlSec }); // binary-safe JSON
}

export async function kvGetJSON<T = unknown>(key: string): Promise<T | null> {
  return (await kv.get<T>(key)) ?? null;
}

export async function kvExists(key: string) {
  return (await kv.exists(key)) > 0;
}


