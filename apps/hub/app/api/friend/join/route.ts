import { getRoomByIdRedis, putRoomRedis } from '@/lib/roomsRedis';
import { getRoomById, putRoom } from '@/lib/roomsStore';
import { getRoomFromMemory, putRoomToMemory } from '@/lib/roomSystemUnified';
import { isRedisAvailable, isDevelopmentWithMemoryFallback } from '@/lib/redis';
import { JoinRoomRequest, RoomResponse } from '@/types/room';
import { NextRequest, NextResponse } from 'next/server';

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
      // ルーム参加（共有ストア優先: Firestore -> Redis -> Memory）
      const rid = roomId.trim();
      console.log('[API] Join room request for:', rid);

      // サーバーサイドのメモリ状況を確認
      try {
        const { getAllServerRooms } = await import('@/lib/roomSystemUnified');
        const allServerRooms = getAllServerRooms();
        console.log('[API] Server memory rooms count:', allServerRooms.length);
        console.log('[API] Server memory rooms IDs:', allServerRooms.map(r => r.id));
      } catch (e) {
        console.log('[API] Could not check server memory rooms');
      }

      let room = await getRoomById(rid);
      console.log('[API] Firestore room:', room ? 'found' : 'not found');

      if (!room) room = await getRoomByIdRedis(rid);
      console.log('[API] Redis room:', room ? 'found' : 'not found');

      if (!room) room = getRoomFromMemory(rid);
      console.log('[API] Memory room:', room ? 'found' : 'not found');

      if (!room) {
        console.log('[API] Room not found anywhere for:', rid);
        throw new Error('not-found');
      }

      console.log('[API] Found room:', JSON.stringify(room, null, 2));
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

        const hasFirestoreEnv = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const hasRedisAvailable = isRedisAvailable();
        const useMemoryFallback = !hasFirestoreEnv && !hasRedisAvailable;

        let persisted = false;

        console.log('[API] Join storage availability:', {
          firestore: hasFirestoreEnv,
          redis: hasRedisAvailable,
          memoryFallback: useMemoryFallback
        });

        if (hasFirestoreEnv) {
          try {
            await putRoom(room);
            persisted = true;
            console.log('[API] Join room saved to Firestore successfully');
          } catch (err) {
            console.warn('[API] joinRoom Firestore putRoom failed:', err instanceof Error ? err.message : err);
          }
        }

        if (hasRedisAvailable) {
          try {
            await putRoomRedis(room);
            persisted = true;
            console.log('[API] Join room saved to Redis/KV successfully');
          } catch (err) {
            console.warn('[API] joinRoom Redis putRoom failed:', err instanceof Error ? err.message : err);
          }
        }

        if (!persisted) {
          // 開発環境または共有ストレージが利用できない場合、メモリフォールバックを使用
          console.log('[API] Using memory fallback for join room:', rid, 'reason:', useMemoryFallback ? 'no storage available' : 'development mode');
          try {
            putRoomToMemory(room);
            console.log('[API] Successfully updated room in memory for join');
            console.log('[API] Updated room details:', JSON.stringify(room, null, 2));
          } catch (err) {
            console.error('[API] Memory fallback failed:', err);
            throw new Error('persist-failed');
          }
        }
      }
      return NextResponse.json({ ok: true, roomId: rid, room }, { status: 200 });
    } catch (e) {
      // エラー処理（共有ストアにない場合や永続化失敗時）
      const msg = (e as Error)?.message;
      const status = msg === 'not-found' ? 404 : msg === 'full' ? 409 : msg === 'locked' ? 423 : msg === 'persist-failed' ? 500 : 500;
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

