import { NextResponse } from 'next/server';
import { getSharedStoreDiagnostics, hasSharedStoreConfig, kvGetJSON, kvSaveJSON } from '@/lib/kv';
import { verifyAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const hasKV = hasSharedStoreConfig();
  const hasVercelRedisRest = Boolean(process.env.VERCEL_REDIS_URL && process.env.VERCEL_REDIS_TOKEN);

  let canPersist = false;
  let detail: string | null = null;

  try {
    if (hasKV || hasVercelRedisRest) {
      await kvSaveJSON('diag:ping', Date.now(), 60);
      const v = await kvGetJSON('diag:ping');
      canPersist = v != null;
    }
  } catch (e: unknown) {
    detail = e instanceof Error ? e.message : String(e);
    console.error('[DIAG] KV persist failed:', detail);
  }

  return NextResponse.json({
    hasKV,
    hasVercelRedisRest,
    canPersist,
    detail,
    diagnostics: getSharedStoreDiagnostics(),
  });
}
