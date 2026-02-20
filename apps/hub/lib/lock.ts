import { randomUUID } from 'crypto';
import { kv } from './kv';

type LockOptions = {
  ttlMs?: number;
  retry?: number;
  retryDelayMs?: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  { ttlMs = 5000, retry = 1, retryDelayMs = 100 }: LockOptions = {},
): Promise<T> {
  const lockKey = `lock:${key}`;
  const token = randomUUID();

  for (let attempt = 0; attempt <= retry; attempt += 1) {
    const acquired = await kv.set(lockKey, token, { nx: true, px: ttlMs });
    if (acquired) {
      try {
        return await fn();
      } finally {
        const currentToken = await kv.get<string>(lockKey);
        if (currentToken === token) {
          await kv.del(lockKey);
        }
      }
    }

    if (attempt < retry) {
      await sleep(retryDelayMs);
    }
  }

  throw new Error(`Could not acquire lock for key: ${key}`);
}
