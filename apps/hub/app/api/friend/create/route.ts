import { putRoom } from '@/lib/roomsStore';
import { putRoomRedis } from '@/lib/roomsRedis';
import { Room } from '@/types/room';
import { upsertLocalRoom } from '@/lib/roomSystemUnified';
import { createRoom } from '@/lib/roomSystemUnified';
import { CreateRoomRequest, RoomResponse } from '@/types/room';
import { NextRequest, NextResponse } from 'next/server';

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

    // ルーム作成（Firestore優先、ハング回避のためタイムアウト付き。失敗/タイムアウト時はメモリにフォールバック）
    const id = String(Math.floor(100000 + Math.random() * 900000));
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

    const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
      return await Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
      ]);
    };

    const hasFirestoreEnv = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (hasFirestoreEnv) {
      try {
        await withTimeout(putRoom(room), 2000);
        // クライアント側のフォールバック参照用にも保存
        upsertLocalRoom(room);
        return NextResponse.json({ ok: true, roomId: id }, { status: 200 });
      } catch (e) {
        console.warn('[API] Firestore putRoom failed or timed out, falling back:', e instanceof Error ? e.message : e);
      }
    }

    // Redis がある場合はRedisに保存
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        await putRoomRedis(room);
        upsertLocalRoom(room);
        return NextResponse.json({ ok: true, roomId: id }, { status: 200 });
      } catch (e) {
        console.warn('[API] Redis putRoom failed, fallback to memory:', e);
      }
    }

    const result = createRoom(roomSize, nickname, turnSeconds, maxCucumbers);
    if (!result.success) {
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 500 });
    }
    // メモリ作成時もクライアント側保存
    upsertLocalRoom({ ...room, id: result.roomId! });
    return NextResponse.json({ ok: true, roomId: result.roomId }, { status: 200 });

  } catch (error) {
    console.error('Room creation error:', error);
    return NextResponse.json(
      { ok: false, reason: 'server-error', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

