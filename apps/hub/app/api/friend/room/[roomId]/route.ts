// Use KV as the single source of truth for room lookups
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { json } from '@/lib/http';

const keyOf = (id: string) => `friend:room:${id}`;
const noStore = { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' } as const;

export async function GET(_req: Request, { params }: { params: { roomId: string } }) {
  const id = String(params.roomId);
  try {
    const room = await kv.get(keyOf(id));
    if (!room) {
      console.warn('[room.lookup.not-found]', { id });
      return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404, headers: noStore });
    }

    await kv.expire(keyOf(id), 60 * 30).catch(() => {});

    return NextResponse.json({ ok: true, room }, { headers: noStore });
  } catch (e: any) {
    console.error('[room.lookup.error]', e);
    return NextResponse.json({ ok: false, reason: 'error', error: String(e?.message ?? e) }, { status: 500, headers: noStore });
  }
}
