import { afterEach, describe, expect, it } from 'vitest';
import { getSharedStoreDiagnostics, hasSharedStoreConfig } from '../kv';

const ORIGINAL_ENV = { ...process.env };

function resetSharedStoreEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.UPSTASH_KV_REST_URL;
  delete process.env.UPSTASH_KV_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.VERCEL_REDIS_URL;
  delete process.env.VERCEL_REDIS_TOKEN;
}

describe('shared store environment detection', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('reports no shared store when no supported env pair exists', () => {
    resetSharedStoreEnv();

    expect(hasSharedStoreConfig()).toBe(false);
    expect(getSharedStoreDiagnostics()).toEqual({
      sharedConfigured: false,
      flags: {
        kv: false,
        upstashKv: false,
        upstashRedis: false,
        vercelRedis: false,
      },
    });
  });

  it('detects Vercel KV credentials', () => {
    resetSharedStoreEnv();
    process.env.KV_REST_API_URL = 'https://example.test';
    process.env.KV_REST_API_TOKEN = 'token';

    expect(hasSharedStoreConfig()).toBe(true);
    expect(getSharedStoreDiagnostics().flags.kv).toBe(true);
  });

  it('detects Upstash Redis credentials as a shared store', () => {
    resetSharedStoreEnv();
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    expect(hasSharedStoreConfig()).toBe(true);
    expect(getSharedStoreDiagnostics().flags.upstashRedis).toBe(true);
  });
});
