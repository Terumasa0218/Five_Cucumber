export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { getRoomByIdRedis, putRoomRedis } from '@/lib/roomsRedis';
import { getRoomById, putRoom } from '@/lib/roomsStore';
import { getRoomFromMemory, putRoomToMemory } from '@/lib/roomSystemUnified';
import { isRedisAvailable, isDevelopmentWithMemoryFallback, redis } from '@/lib/redis';
import { realtime } from '@/lib/realtime';
import { JoinRoomRequest, RoomResponse } from '@/types/room';
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const keyOf = (id: string) => `friend:room:${id}`;

export async function POST(req: NextRequest): Promise<NextResponse<RoomResponse>> {
  try {
    const raw = await req.json();
    const body: JoinRoomRequest = raw;
    const { nickname } = body;
    const roomId = String((body as any).roomId ?? (body as any).code ?? (body as any).roomCode ?? '');

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
      // まず KV を優先して確認（単一の真実）
      const rid = roomId.trim();
      console.log('[API] Join room request for:', rid);

      try {
        const kvRoom = await kv.get<any>(keyOf(rid));
        if (kvRoom) {
          console.log('[API] Room loaded from KV for join');
          let room: any = kvRoom;
          if (room.status !== 'waiting') {
            return NextResponse.json({ ok: false, reason: 'locked' }, { status: 423 });
          }
          const trimmedNickname = nickname.trim();
          const already = room.seats.some((s: any) => s?.nickname === trimmedNickname);
          if (!already) {
            const emptyIndex = room.seats.findIndex((s: any) => s === null);
            if (emptyIndex === -1) return NextResponse.json({ ok: false, reason: 'full' }, { status: 409 });
            room.seats[emptyIndex] = { nickname: trimmedNickname };
            await kv.set(keyOf(rid), room, { ex: 60 * 30 });
          }
          return NextResponse.json({ ok: true, roomId: rid, room }, { status: 200 });
        }
      } catch (e) {
        console.warn('[API] KV get failed, fallback to existing stores:', e);
      }

      // 以降は従来の共有ストア（Firestore -> Redis -> Memory）
      // サーバーサイドのメモリ状況を確認
      try {
        const { getAllServerRooms } = await import('@/lib/roomSystemUnified');
        const allServerRooms = getAllServerRooms();
        console.log('[API] Server memory rooms count:', allServerRooms.length);
        console.log('[API] Server memory rooms IDs:', allServerRooms.map(r => r.id));
      } catch (e) {
        console.log('[API] Could not check server memory rooms');
      }

      let room = await getRoomById(roomId.trim());
      console.log('[API] Firestore room:', room ? 'found' : 'not found');

      if (!room) room = await getRoomByIdRedis(roomId.trim());
      console.log('[API] Redis room:', room ? 'found' : 'not found');

      if (!room) room = getRoomFromMemory(roomId.trim());
      console.log('[API] Memory room:', room ? 'found' : 'not found');

      if (!room) {
        console.log('[API] Room not found anywhere for:', roomId.trim());
        throw new Error('not-found');
      }

      console.log('[API] Found room:', JSON.stringify(room, null, 2));
      if (room.status !== 'waiting') {
        return NextResponse.json({ ok: false, reason: 'locked' }, { status: 423 });
      }

      const trimmedNickname = nickname.trim();
      const already = room.seats.some((s: any) => s?.nickname === trimmedNickname);
      if (!already) {
        const hasRedisAvailable = isRedisAvailable();

        // KVが使える場合はロックして再検証・割当て（同時実行対策）
        if (hasRedisAvailable) {
          const key = `lock:room:${roomId.trim()}:join`;
          const token = `${Date.now()}:${Math.random()}`;
          const ok = await redis.set(key, token, { nx: true, ex: 3 } as any);
          if (ok !== 'OK') {
            return NextResponse.json({ ok: false, reason: 'busy' } as any, { status: 423 });
          }
          try {
            let latest = await getRoomByIdRedis(roomId.trim());
            if (!latest) latest = await getRoomById(roomId.trim());
            if (!latest) throw new Error('not-found');
            if (latest.status !== 'waiting') {
              return NextResponse.json({ ok: false, reason: 'locked' }, { status: 423 });
            }
            if (!latest.seats.some((s: any) => s?.nickname === trimmedNickname)) {
              const empty = latest.seats.findIndex((s: any) => s === null);
              if (empty === -1) return NextResponse.json({ ok: false, reason: 'full' }, { status: 409 });
              latest.seats[empty] = { nickname: trimmedNickname };
              await putRoomRedis(latest);
            }
            room = latest;
          } finally {
            const v = await redis.get<string>(key);
            if (v === token) await redis.del(key);
          }
        } else {
          // 旧来の非ロック処理（KVなし環境）
          const emptyIndex = room.seats.findIndex((s: any) => s === null);
          if (emptyIndex === -1) {
            return NextResponse.json({ ok: false, reason: 'full' }, { status: 409 });
          }
          room.seats[emptyIndex] = { nickname: trimmedNickname };
        }

        const hasFirestoreEnv = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        // 本番は VERCEL_ENV==='production' のみ。preview/development ではメモリフォールバックを許可
        const isProd = process.env.VERCEL_ENV === 'production';
        const useMemoryFallback = !hasFirestoreEnv && !hasRedisAvailable && !isProd;

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
          // 本番ではメモリフォールバックを禁止
          if (isProd) {
            console.error('[API] No persistent storage available in production (join)');
            throw new Error('server-error');
          }
          // 開発環境ではメモリフォールバックを使用
          console.log('[API] Using memory fallback for join room:', roomId.trim(), 'reason:', useMemoryFallback ? 'no storage available' : 'development mode');
          try {
            putRoomToMemory(room);
            console.log('[API] Successfully updated room in memory for join');
            console.log('[API] Updated room details:', JSON.stringify(room, null, 2));
          } catch (err) {
            console.error('[API] Memory fallback failed:', err);
            throw new Error('persist-failed');
          }
        }

        // ルーム参加成功時にリアルタイム通知を送信
        console.log('[API] Broadcasting room join event to all room members');
        try {
          const members = room.seats.filter((seat: any) => seat !== null).map((seat: any) => seat!.nickname);
          console.log('[API] Current room members:', members);
          await realtime.publishToMany(roomId.trim(), members, 'room_updated', (uid) => ({
            room: room,
            event: 'player_joined',
            joinedPlayer: trimmedNickname
          }));
          console.log('[API] Successfully broadcasted room join event');
        } catch (realtimeError) {
          console.warn('[API] Failed to broadcast room join event:', realtimeError);
        }
      }

      return NextResponse.json({ ok: true, roomId: roomId.trim(), room }, { status: 200 });
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

