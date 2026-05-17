export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { kvGetJSON, kvSaveJSON, roomTTL } from '@/lib/kv';
import { withLock } from '@/lib/lock';
import { realtime } from '@/lib/realtime';
import { joinRoomSnapshot, normalizeNickname, normalizeRoomId } from '@/lib/friend-room';
import { Room, RoomSeat } from '@/types/room';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

const keyOf = (id: string) => `friend:room:${id}`;
const noStore = { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' } as const;

type JoinRoomPayload = {
  roomId?: unknown;
  code?: unknown;
  roomCode?: unknown;
  nickname?: unknown;
};

const isOccupiedSeat = (seat: RoomSeat): seat is Exclude<RoomSeat, null> => seat !== null;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const raw = (await req.json()) as JoinRoomPayload;
    const nicknameInput = normalizeNickname(raw.nickname);
    const roomIdCandidate = raw.roomId ?? raw.code ?? raw.roomCode;
    const roomId = normalizeRoomId(roomIdCandidate);

    if (!nicknameInput || roomId.length !== 6) {
      return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400, headers: noStore });
    }

    const { room, status } = await withLock(`friend-room:${roomId}`, async () => {
      const room = await kvGetJSON<Room>(keyOf(roomId));
      const result = joinRoomSnapshot(room, nicknameInput);
      if (!result.ok) {
        return { status: result.reason };
      }

      await kvSaveJSON(keyOf(roomId), result.room, roomTTL);
      return { status: 'ok' as const, room: result.room };
    }, { retry: 2, retryDelayMs: 100 });

    if (status === 'not-found') {
      return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404, headers: noStore });
    }
    if (status === 'locked') {
      return NextResponse.json({ ok: false, reason: 'locked' }, { status: 423, headers: noStore });
    }
    if (status === 'full') {
      return NextResponse.json({ ok: false, reason: 'full' }, { status: 409, headers: noStore });
    }
    if (!room) {
      return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400, headers: noStore });
    }

    try {
      const members = room.seats.filter(isOccupiedSeat).map((seat) => seat.nickname);
      await realtime.publishToMany(roomId, members, 'room_updated', () => ({ room, event: 'player_joined', joinedPlayer: nicknameInput }));
    } catch {}

    return NextResponse.json({ ok: true, roomId, room }, { status: 200, headers: noStore });
  } catch (e) {
    console.error('[API] join error:', e);
    return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500, headers: noStore });
  }
}
