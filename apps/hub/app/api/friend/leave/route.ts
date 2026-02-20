import { NextRequest, NextResponse } from 'next/server';
import { getRoomById, putRoom } from '@/lib/roomsStore';
import { getRoomByIdRedis, putRoomRedis } from '@/lib/roomsRedis';
import { getRoomFromMemory, putRoomToMemory } from '@/lib/roomSystemUnified';
import { HAS_SHARED_STORE } from '@/lib/serverSync';
import { json } from '@/lib/http';
import { isRedisAvailable } from '@/lib/redis';
import { realtime } from '@/lib/realtime';
import type { RoomSeat } from '@/types/room';
import { kv } from '@vercel/kv';
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

    const rid = roomId;
    const name = nickname;

    // 共有ストアからルームを検索（Firestore -> Redis/KV -> Memory）
    let room = await getRoomById(rid);
    if (!room && isRedisAvailable()) room = await getRoomByIdRedis(rid);
    if (!room && HAS_SHARED_STORE) room = getRoomFromMemory(rid);

    if (!room) {
      return json({ ok: false, reason: 'not-found' }, 404);
    }

    const idx = room.seats.findIndex(s => s?.nickname === name);
    if (idx >= 0) {
      room.seats[idx] = null;

      let persisted = false;
      try {
        await putRoom(room);
        persisted = true;
      } catch {}

      if (!persisted && isRedisAvailable()) {
        try {
          await putRoomRedis(room);
          persisted = true;
        } catch {}
      }

      if (!persisted && HAS_SHARED_STORE) {
        putRoomToMemory(room);
      }

      // KV を唯一のソースとして同期
      try {
        await kv.set(keyOf(rid), room, { ex: 60 * 30 });
      } catch (e) {
        console.warn('[API] leave: failed to sync KV:', e);
      }

      // 退出をリアルタイム通知
      const members = room.seats.filter(isOccupiedSeat).map((seat) => seat.nickname);
      try {
        await realtime.publishToMany(rid, members, 'room_updated', () => ({ room, event: 'player_left', leftPlayer: name }));
      } catch {}
    }
    return json({ ok: true }, 200);
  } catch (error) {
    console.error('[API] leave room error:', error);
    return json({ ok: false, reason: 'server-error' }, 500);
  }
}


