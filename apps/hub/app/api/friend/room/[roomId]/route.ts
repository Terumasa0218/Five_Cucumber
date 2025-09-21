// Use KV as the single source of truth for room lookups
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

const keyOf = (id: string) => `friend:room:${id}`;

export async function GET(_req: Request, { params }: { params: { roomId: string } }) {
  const id = String(params.roomId);
  try {
    const room = await kv.get(keyOf(id));
    if (!room) {
      return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 });
    }

    // 任意: 待機中のTTL延長（30分）
    await kv.expire(keyOf(id), 60 * 30).catch(() => {});

    return NextResponse.json({ ok: true, room });
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: 'error', error: String(e?.message ?? e) }, { status: 500 });
  }
}
