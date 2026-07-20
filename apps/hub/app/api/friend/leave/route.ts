import { NextRequest, NextResponse } from 'next/server';
import { json } from '@/lib/http';
import { realtime } from '@/lib/realtime';
import type { Room, RoomSeat } from '@/types/room';
import { kvGetJSON, kvSaveJSON, roomTTL } from '@/lib/kv';
import { getAuthFailureBody, getAuthFailureStatus, verifyAuthDetailed } from '@/lib/auth';
import { withLock } from '@/lib/lock';
import { normalizeNickname, normalizeRoomId } from '@/lib/friend-room';

const keyOf = (id: string) => `friend:room:${id}`;
const noStore = { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' } as const;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type LeaveRoomPayload = {
  roomId?: unknown;
  nickname?: unknown;
};

const isOccupiedSeat = (seat: RoomSeat): seat is Exclude<RoomSeat, null> => seat !== null;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuthDetailed(req);
  if (!auth.ok) {
    return NextResponse.json(getAuthFailureBody(auth.detail), {
      status: getAuthFailureStatus(auth.detail.reason),
      headers: noStore,
    });
  }
  try {
    const body = (await req.json()) as LeaveRoomPayload;
    const roomId = normalizeRoomId(body.roomId);
    const nickname = normalizeNickname(body.nickname);

    if (roomId.length !== 6 || !nickname) {
      return json({ ok: false, reason: 'bad-request' }, 400);
    }

    const { room, status } = await withLock(`friend-room:${roomId}`, async () => {
      const room = await kvGetJSON<Room>(keyOf(roomId));
      if (!room) {
        return { status: 'not-found' as const };
      }

      const idx = room.seats.findIndex((s) => s?.nickname === nickname);
      if (idx >= 0) {
        room.seats[idx] = null;
        await kvSaveJSON(keyOf(roomId), room, roomTTL);
      }

      return { status: 'ok' as const, room };
    }, { retry: 2, retryDelayMs: 100 });

    if (status === 'not-found') {
      return json({ ok: false, reason: 'not-found' }, 404);
    }

    const members = room.seats.filter(isOccupiedSeat).map((seat) => seat.nickname);
    try {
      await realtime.publishToMany(roomId, members, 'room_updated', () => ({ room, event: 'player_left', leftPlayer: nickname }));
    } catch {}

    return json({ ok: true }, 200);
  } catch (error) {
    console.error('[API] leave room error:', error);
    return json({ ok: false, reason: 'server-error' }, 500);
  }
}
