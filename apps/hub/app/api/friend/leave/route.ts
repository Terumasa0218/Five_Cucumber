import { NextRequest, NextResponse } from 'next/server';
import { json } from '@/lib/http';
import { realtime } from '@/lib/realtime';
import type { Room, RoomSeat } from '@/types/room';
import { kvGetJSON, kvSaveJSON, roomTTL } from '@/lib/kv';
import { verifyAuth } from '@/lib/auth';

const keyOf = (id: string) => `friend:room:${id}`;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type LeaveRoomPayload = {
  roomId?: unknown;
  nickname?: unknown;
};

const isOccupiedSeat = (seat: RoomSeat): seat is Exclude<RoomSeat, null> => seat !== null;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = (await req.json()) as LeaveRoomPayload;
    const roomId = typeof body.roomId === 'string' ? body.roomId.trim() : '';
    const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';

    if (!roomId || !nickname) {
      return json({ ok: false, reason: 'bad-request' }, 400);
    }

    const room = await kvGetJSON<Room>(keyOf(roomId));
    if (!room) {
      return json({ ok: false, reason: 'not-found' }, 404);
    }

    const idx = room.seats.findIndex((s) => s?.nickname === nickname);
    if (idx >= 0) {
      room.seats[idx] = null;
      await kvSaveJSON(keyOf(roomId), room, roomTTL);

      const members = room.seats.filter(isOccupiedSeat).map((seat) => seat.nickname);
      try {
        await realtime.publishToMany(roomId, members, 'room_updated', () => ({ room, event: 'player_left', leftPlayer: nickname }));
      } catch {}
    }

    return json({ ok: true }, 200);
  } catch (error) {
    console.error('[API] leave room error:', error);
    return json({ ok: false, reason: 'server-error' }, 500);
  }
}
