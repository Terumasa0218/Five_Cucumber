import { getRoomById } from '@/lib/roomsStore';
import { getRoomByIdRedis } from '@/lib/roomsRedis';
import { persistRoomToStores } from '@/lib/persistRoom';
import { Room } from '@/types/room';
import { CreateRoomRequest, RoomResponse } from '@/types/room';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse<RoomResponse>> {
  try {
    // リクエストボディの取得と検証
    let body: CreateRoomRequest;
    try {
      const text = await req.text();
      console.log('[API] Raw request body:', text);
      
      if (!text || text.trim() === '') {
        throw new Error('Empty request body');
      }
      
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('[API] JSON parse error:', parseError);
      return NextResponse.json(
        { ok: false, reason: 'invalid-json', detail: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { roomSize, nickname, turnSeconds, maxCucumbers } = body;

    // バリデーション
    if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400 }
      );
    }

    if (!roomSize || typeof roomSize !== 'number' || roomSize < 2 || roomSize > 6) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400 }
      );
    }

    if (typeof turnSeconds !== 'number' || turnSeconds < 0) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400 }
      );
    }

    if (!maxCucumbers || typeof maxCucumbers !== 'number' || maxCucumbers < 4 || maxCucumbers > 7) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400 }
      );
    }

    // ルーム作成（Firestore/Redis へ並列永続化。Firestoreはタイムアウトを付けてハングを回避）
    // 6桁IDを重複しないように最大100回まで試行
    let id = '';
    for (let i = 0; i < 100; i++) {
      const cand = String(Math.floor(100000 + Math.random() * 900000));
      const exists = (await getRoomByIdRedis(cand)) || (await getRoomById(cand));
      if (!exists) { id = cand; break; }
    }
    if (!id) {
      return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500 });
    }
    const room: Room = {
      id,
      size: roomSize,
      seats: Array.from({ length: roomSize }, () => null),
      status: 'waiting',
      createdAt: Date.now(),
      turnSeconds,
      maxCucumbers
    };
    room.seats[0] = { nickname: nickname.trim() };

codex/fix-room-access-issue-and-debug-62oc8l
    try {
      await persistRoomToStores(room, 'friend/create', { firestoreTimeoutMs: 2000 });
    } catch (persistError) {
      const reason = persistError instanceof Error ? persistError.message : 'persist-failed';
      console.error('[API] Room persistence failed (create):', persistError);
      return NextResponse.json({ ok: false, reason }, { status: 500 });
    }

    const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
      return await Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
      ]);
    };

    const hasFirestoreEnv = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const hasRedisEnv = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

    let persisted = false;

    if (hasFirestoreEnv) {
      try {
        await withTimeout(putRoom(room), 2000);
        persisted = true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('[API] Firestore putRoom failed or timed out:', msg);
      }
    }

    if (hasRedisEnv) {
      try {
        await putRoomRedis(room);
        persisted = true;
      } catch (e) {
        console.warn('[API] Redis putRoom failed:', e);
      }
    }

    if (!persisted) {
      // サーバー共有ストレージが無い場合は失敗を返す（serverlessでの分断を避ける）
      return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500 });
    }

 main
    return NextResponse.json({ ok: true, roomId: id }, { status: 200 });

  } catch (error) {
    console.error('Room creation error:', error);
    return NextResponse.json(
      { ok: false, reason: 'server-error', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

