export const runtime = 'nodejs';

import { hasSharedStoreConfig, kvGetJSON, kvSaveJSON } from '@/lib/kv';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

const keyPrefix = 'diag:shared-store';

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const hasKV = hasSharedStoreConfig();
  const hasVercelRedisRest = !!(process.env.VERCEL_REDIS_URL && process.env.VERCEL_REDIS_TOKEN);

  let canPersist = false;
  let detail: string | null = null;

  if (hasKV || hasVercelRedisRest) {
    const key = `${keyPrefix}:${Date.now()}`;
    try {
      await kvSaveJSON(key, Date.now(), 60);
      const roundTrip = await kvGetJSON(key);
      canPersist = roundTrip !== null && roundTrip !== undefined;
    } catch (error) {
      detail = error instanceof Error ? error.message : String(error);
      console.error('[DIAG] KV persist failed:', detail);
    }
  }

  return NextResponse.json({ hasKV, hasVercelRedisRest, canPersist, detail });
}


