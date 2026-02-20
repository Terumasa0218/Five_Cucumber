export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { kvGetJSON, kvSaveJSON, roomTTL } from '@/lib/kv';
import { realtime } from '@/lib/realtime';
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
    const nicknameInput = typeof raw.nickname === 'string' ? raw.nickname.trim() : '';
    const roomIdCandidate = raw.roomId ?? raw.code ?? raw.roomCode;
    const roomId = roomIdCandidate === undefined || roomIdCandidate === null ? '' : String(roomIdCandidate).trim();

    if (!nicknameInput || !roomId) {
      return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400, headers: noStore });
    }

    const room = await kvGetJSON<Room>(keyOf(roomId));
    if (!room) {
      return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404, headers: noStore });
    }
    if (room.status !== 'waiting') {
      return NextResponse.json({ ok: false, reason: 'locked' }, { status: 423, headers: noStore });
    }

    const already = room.seats.some((seat) => seat?.nickname === nicknameInput);
    if (!already) {
      const emptyIndex = room.seats.findIndex((seat) => seat === null);
      if (emptyIndex === -1) {
        return NextResponse.json({ ok: false, reason: 'full' }, { status: 409, headers: noStore });
      }
      room.seats[emptyIndex] = { nickname: nicknameInput };
    }

    await kvSaveJSON(keyOf(roomId), room, roomTTL);

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
