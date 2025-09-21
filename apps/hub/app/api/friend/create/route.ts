export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { getRoomById, putRoom } from '@/lib/roomsStore';
import { getRoomByIdRedis, putRoomRedis } from '@/lib/roomsRedis';
import { getRoomFromMemory, putRoomToMemory } from '@/lib/roomSystemUnified';
import { kv } from '@vercel/kv';
import { isRedisAvailable, isDevelopmentWithMemoryFallback } from '@/lib/redis';
import { Room } from '@/types/room';
import { CreateRoomRequest, RoomResponse } from '@/types/room';
import { NextRequest, NextResponse } from 'next/server';

const noStore = { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' } as const;

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
        { status: 400, headers: noStore }
      );
    }
    
    const { roomSize, nickname, turnSeconds, maxCucumbers } = body;

    // バリデーション
    if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400, headers: noStore }
      );
    }

    if (!roomSize || typeof roomSize !== 'number' || roomSize < 2 || roomSize > 6) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400, headers: noStore }
      );
    }

    if (typeof turnSeconds !== 'number' || turnSeconds < 0) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400, headers: noStore }
      );
    }

    if (!maxCucumbers || typeof maxCucumbers !== 'number' || maxCucumbers < 4 || maxCucumbers > 7) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400, headers: noStore }
      );
    }

    // ルーム作成（共有ストア優先、ハング回避のためタイムアウト付き。失敗時はメモリにフォールバック）
    // 6桁IDを重複しないように最大100回まで試行
    let id = '';
    for (let i = 0; i < 100; i++) {
      const cand = String(Math.floor(100000 + Math.random() * 900000));
      const existsInFirestore = await getRoomById?.(cand);
      const existsInRedis = await getRoomByIdRedis?.(cand);
      const existsInMemory = getRoomFromMemory(cand);
      const exists = existsInFirestore || existsInRedis || existsInMemory;
      if (!exists) { id = cand; break; }
    }
    if (!id) {
      return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500, headers: noStore });
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

    const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
      return await Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
      ]);
    };

    const hasFirestoreEnv = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const hasRedisAvailable = isRedisAvailable();
    // 本番は VERCEL_ENV==='production' のみ。preview/development ではメモリフォールバックを許可
    const isProd = process.env.VERCEL_ENV === 'production';
    const useMemoryFallback = !hasFirestoreEnv && !hasRedisAvailable && !isProd;

    let persisted = false;
    let storageUsed = '';

    console.log('[API] Storage availability:', {
      firestore: hasFirestoreEnv,
      redis: hasRedisAvailable,
      memoryFallback: useMemoryFallback
    });

    if (hasFirestoreEnv) {
      try {
        await withTimeout(putRoom(room), 2000);
        persisted = true;
        storageUsed = 'Firestore';
        console.log('[API] Room saved to Firestore successfully');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('[API] Firestore putRoom failed or timed out:', msg);
      }
    }

    if (hasRedisAvailable) {
      try {
        await putRoomRedis(room);
        persisted = true;
        storageUsed = 'Redis/KV';
        console.log('[API] Room saved to Redis/KV successfully');
      } catch (e) {
        console.warn('[API] Redis putRoom failed:', e);
      }
    }

    if (!persisted) {
      // 本番ではメモリフォールバックを禁止（サーバーレスで共有されないため）
      if (isProd) {
        console.error('[API] No persistent storage available in production');
        return NextResponse.json({ ok: false, reason: 'server-error', detail: 'No persistent storage in production' }, { status: 500, headers: noStore });
      }
      // 開発環境ではメモリフォールバックを使用
      console.log('[API] Using memory fallback for room:', id, 'reason:', useMemoryFallback ? 'no storage available' : 'development mode');
      try {
        const { getAllServerRooms } = await import('@/lib/roomSystemUnified');
        const allServerRooms = getAllServerRooms();
        console.log('[API] Server memory rooms count before save:', allServerRooms.length);
        console.log('[API] Server memory rooms IDs before save:', allServerRooms.map(r => r.id));

        putRoomToMemory(room);
        storageUsed = 'Memory';
        console.log('[API] Successfully created room in memory');

        const allServerRoomsAfter = getAllServerRooms();
        console.log('[API] Server memory rooms count after save:', allServerRoomsAfter.length);
        console.log('[API] Server memory rooms IDs after save:', allServerRoomsAfter.map(r => r.id));
        console.log('[API] Room details:', JSON.stringify(room, null, 2));
      } catch (e) {
        console.error('[API] Memory fallback failed:', e);
        return NextResponse.json({
          ok: false,
          reason: 'server-error',
          detail: 'Failed to create room in any storage'
        }, { status: 500, headers: noStore });
      }
    }

    // 決定した部屋IDを文字列に統一して KV に必ず保存（TTL 30分）
    const roomId = String(room.id ?? id);
    try {
      const key = `friend:room:${roomId}`;
      await kv.set(key, room, { ex: 60 * 30 });
      console.log('[API] Room persisted to KV:', key);
    } catch (e) {
      console.warn('[API] KV persist failed:', e);
    }

    return NextResponse.json({ ok: true, roomId }, { status: 200, headers: noStore });

  } catch (error) {
    console.error('Room creation error:', error);
    return NextResponse.json(
      { ok: false, reason: 'server-error', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: noStore }
    );
  }
}

