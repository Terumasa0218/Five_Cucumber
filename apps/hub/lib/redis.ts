import { hasSharedStoreConfig, kv } from './kv';

export const redis = kv;
const DEBUG_ROOMS = process.env.NEXT_PUBLIC_DEBUG_ROOMS === '1';

// Vercel KVが利用できない場合のフォールバック
export const isRedisAvailable = () => {
  if (typeof process === 'undefined') return false;
  const enabled = hasSharedStoreConfig();
  if (DEBUG_ROOMS) {
    console.log('[Redis] KV availability:', { enabled, nodeEnv: process.env.NODE_ENV });
  }
  return enabled;
};

// 開発環境でのみメモリフォールバックを強制的に有効化
export const isDevelopmentWithMemoryFallback = () => {
  return process.env.NODE_ENV === 'development' && !isRedisAvailable();
};



