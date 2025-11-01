export const runtime = 'nodejs';

import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

const keyPrefix = 'diag:shared-store';

export async function GET() {
  const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  const hasVercelRedisRest = !!(process.env.VERCEL_REDIS_URL && process.env.VERCEL_REDIS_TOKEN);

  let canPersist = false;
  let detail: string | null = null;

  if (hasKV || hasVercelRedisRest) {
    const key = `${keyPrefix}:${Date.now()}`;
    try {
      await kv.set(key, Date.now(), { ex: 60 });
      const roundTrip = await kv.get(key);
      canPersist = roundTrip !== null && roundTrip !== undefined;
    } catch (error) {
      detail = error instanceof Error ? error.message : String(error);
      console.error('[DIAG] KV persist failed:', detail);
    }
  }

  return NextResponse.json({ hasKV, hasVercelRedisRest, canPersist, detail });
}


