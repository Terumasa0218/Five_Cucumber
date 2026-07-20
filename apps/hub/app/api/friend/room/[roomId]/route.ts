// Use KV as the single source of truth for room lookups
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { kvExpire, kvGetJSON, roomTTL } from '@/lib/kv';
import { NextResponse } from 'next/server';
import type { Room } from '@/types/room';
import { getAuthFailureBody, getAuthFailureStatus, verifyAuthDetailed } from '@/lib/auth';
import { normalizeRoomId } from '@/lib/friend-room';

const keyOf = (id: string) => `friend:room:${id}`;
const noStore = { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' } as const;

export async function GET(req: Request, { params }: { params: { roomId: string } }) {
  const auth = await verifyAuthDetailed(req);
  if (!auth.ok) {
    return NextResponse.json(getAuthFailureBody(auth.detail), {
      status: getAuthFailureStatus(auth.detail.reason),
      headers: noStore,
    });
  }
  const id = normalizeRoomId(params.roomId);
  if (id.length !== 6) {
    return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400, headers: noStore });
  }
  try {
    const room = await kvGetJSON<Room>(keyOf(id));
    if (!room) {
      console.warn('[room.lookup.not-found]', { id });
      return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404, headers: noStore });
    }

    await kvExpire(keyOf(id), roomTTL).catch(() => {});

    return NextResponse.json({ ok: true, room }, { headers: noStore });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[room.lookup.error]', error);
    return NextResponse.json({ ok: false, reason: 'error', error: message }, { status: 500, headers: noStore });
  }
}
