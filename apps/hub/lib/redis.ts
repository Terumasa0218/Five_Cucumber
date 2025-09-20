import { kv } from '@vercel/kv';

export const redis = kv;

// Vercel KVが利用できない場合のフォールバック
export const isRedisAvailable = () => {
  try {
    return typeof process !== 'undefined' && process.env;
  } catch {
    return false;
  }
};



