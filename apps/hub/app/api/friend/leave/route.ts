import { NextRequest, NextResponse } from 'next/server';
import { getRoomById, putRoom } from '@/lib/roomsStore';
import { getRoomByIdRedis, putRoomRedis } from '@/lib/roomsRedis';
import { getRoomFromMemory, putRoomToMemory } from '@/lib/roomSystemUnified';
import { isRedisAvailable } from '@/lib/redis';
import { realtime } from '@/lib/realtime';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { roomId, nickname } = body as { roomId?: string; nickname?: string };

    if (!roomId || !nickname || !nickname.trim()) {
      return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 });
    }

    const rid = roomId.trim();
    const name = nickname.trim();

    // 共有ストアからルームを検索（Firestore -> Redis/KV -> Memory）
    let room = await getRoomById(rid);
    if (!room && isRedisAvailable()) room = await getRoomByIdRedis(rid);
    if (!room) room = getRoomFromMemory(rid);

    if (!room) {
      return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 });
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

      if (!persisted) {
        putRoomToMemory(room);
      }

      // 退出をリアルタイム通知
      const members = room.seats.filter(s => s !== null).map(s => (s as any).nickname as string);
      try {
        await realtime.publishToMany(rid, members, 'room_updated', () => ({ room, event: 'player_left', leftPlayer: name }));
      } catch {}
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[API] leave room error:', error);
    return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500 });
  }
}


