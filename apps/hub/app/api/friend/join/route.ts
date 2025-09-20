 codex/fix-room-access-issue-and-debug-62oc8l
import { getRoomByIdRedis } from '@/lib/roomsRedis';
import { getRoomById } from '@/lib/roomsStore';
import { persistRoomToStores } from '@/lib/persistRoom';

import { getRoomByIdRedis, putRoomRedis } from '@/lib/roomsRedis';
import { getRoomById, putRoom } from '@/lib/roomsStore';
 main
import { JoinRoomRequest, RoomResponse } from '@/types/room';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse<RoomResponse>> {
  try {
    const body: JoinRoomRequest = await req.json();
    const { roomId, nickname } = body;

    // バリデーション
    if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400 }
      );
    }

    if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400 }
      );
    }

    try {
      // ルーム参加（共有ストア優先: Redis -> Firestore）
      const rid = roomId.trim();
      let room = await getRoomByIdRedis(rid);
      if (!room) room = await getRoomById(rid);
      if (!room) {
        throw new Error('not-found');
      }
      if (room.status !== 'waiting') {
        return NextResponse.json({ ok: false, reason: 'locked' }, { status: 423 });
      }

      const trimmedNickname = nickname.trim();
      const already = room.seats.some(s => s?.nickname === trimmedNickname);
      if (!already) {
        const emptyIndex = room.seats.findIndex(s => s === null);
        if (emptyIndex === -1) {
          return NextResponse.json({ ok: false, reason: 'full' }, { status: 409 });
        }

        room.seats[emptyIndex] = { nickname: trimmedNickname };

 codex/fix-room-access-issue-and-debug-62oc8l
        try {
          await persistRoomToStores(room, 'friend/join');
        } catch (persistError) {
          const reason = persistError instanceof Error ? persistError.message : 'persist-failed';
          throw new Error(reason);

        const hasFirestoreEnv = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const hasRedisEnv = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
        let persisted = false;

        if (hasFirestoreEnv) {
          try {
            await putRoom(room);
            persisted = true;
          } catch (err) {
            console.warn('[API] joinRoom Firestore putRoom failed:', err instanceof Error ? err.message : err);
          }
        }

        if (hasRedisEnv) {
          try {
            await putRoomRedis(room);
            persisted = true;
          } catch (err) {
            console.warn('[API] joinRoom Redis putRoom failed:', err instanceof Error ? err.message : err);
          }
        }

        if (!persisted) {
          throw new Error('persist-failed');
 main
        }
      }
      return NextResponse.json({ ok: true, roomId: rid, room }, { status: 200 });
    } catch (e) {
      // 共有ストアに無い場合は明確に not-found を返す（serverless間での分断を可視化）
      const msg = (e as Error)?.message;
      const status = msg === 'not-found' ? 404 : msg === 'full' ? 409 : msg === 'locked' ? 423 : 500;
      return NextResponse.json({ ok: false, reason: msg ?? 'server-error' }, { status });
    }

  } catch (error) {
    console.error('Room join error:', error);
    return NextResponse.json(
      { ok: false, reason: 'server-error' },
      { status: 500 }
    );
  }
}

