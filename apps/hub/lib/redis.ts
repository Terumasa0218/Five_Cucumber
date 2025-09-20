import { kv } from '@vercel/kv';

export const redis = kv;

// Vercel KVが利用できない場合のフォールバック
export const isRedisAvailable = () => {
  if (typeof process === 'undefined') return false;
  const hasUrl = !!process.env.KV_REST_API_URL || !!process.env.VERCEL_REDIS_URL;
  const hasToken = !!process.env.KV_REST_API_TOKEN || !!process.env.VERCEL_REDIS_TOKEN;
  const enabled = hasUrl && hasToken;
  console.log('[Redis] KV availability:', { hasUrl, hasToken, enabled, nodeEnv: process.env.NODE_ENV });
  return enabled;
};

// 開発環境でのみメモリフォールバックを強制的に有効化
export const isDevelopmentWithMemoryFallback = () => {
  return process.env.NODE_ENV === 'development' && !isRedisAvailable();
};



