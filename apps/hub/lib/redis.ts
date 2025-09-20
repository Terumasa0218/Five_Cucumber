import { kv } from '@vercel/kv';

export const redis = kv;

// Vercel KVが利用できない場合のフォールバック
export const isRedisAvailable = () => {
  // Vercel KVはVercelプラットフォームでのみ動作する
  // ローカル開発では常にfalseを返す
  if (typeof process === 'undefined') return false;

  // Vercel環境では自動的に利用可能になる
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
  console.log('[Redis] Environment check:', {
    isVercel,
    vercel: process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV
  });

  return isVercel === true;
};

// 開発環境でのみメモリフォールバックを強制的に有効化
export const isDevelopmentWithMemoryFallback = () => {
  return process.env.NODE_ENV === 'development' && !isRedisAvailable();
};



