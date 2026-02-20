// Use KV as the single source of truth for room lookups
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import type { Room } from '@/types/room';
import { verifyAuth } from '@/lib/auth';

const keyOf = (id: string) => `friend:room:${id}`;
const noStore = { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' } as const;

export async function GET(req: Request, { params }: { params: { roomId: string } }) {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = String(params.roomId);
  try {
    const room = await kv.get<Room>(keyOf(id));
    if (!room) {
      console.warn('[room.lookup.not-found]', { id });
      return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404, headers: noStore });
    }

    await kv.expire(keyOf(id), 60 * 30).catch(() => {});

    return NextResponse.json({ ok: true, room }, { headers: noStore });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[room.lookup.error]', error);
    return NextResponse.json({ ok: false, reason: 'error', error: message }, { status: 500, headers: noStore });
  }
}
