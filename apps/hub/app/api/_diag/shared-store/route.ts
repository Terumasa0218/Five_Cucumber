import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Nodeクライアントを使っていない想定。使っているなら 'nodejs'
export const runtime = 'edge';

export async function GET() {
  const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  const hasVercelRedisRest = !!(process.env.VERCEL_REDIS_URL && process.env.VERCEL_REDIS_TOKEN);

  let canPersist = false;
  let detail: string | null = null;

  try {
    if (hasKV || hasVercelRedisRest) {
      await kv.set('diag:ping', Date.now(), { ex: 60 });
      const v = await kv.get('diag:ping');
      canPersist = v != null;
    }
  } catch (e: any) {
    detail = e?.message ?? String(e);
    console.error('[DIAG] KV persist failed:', detail);
  }

  return NextResponse.json({ hasKV, hasVercelRedisRest, canPersist, detail });
}
