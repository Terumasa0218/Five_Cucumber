export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { getRoomByIdRedis, putRoomRedis } from '@/lib/roomsRedis';
import { getRoomById, putRoom } from '@/lib/roomsStore';
// memory fallback is prohibited for server APIs
import { isRedisAvailable, isDevelopmentWithMemoryFallback } from '@/lib/redis';
import { HAS_SHARED_STORE } from '@/lib/serverSync';
import { putRoomToMemory } from '@/lib/roomSystemUnified';
import { CreateRoomRequest, Room, RoomResponse } from '@/types/room';
import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

const noStore = { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' } as const;

// 値が number か、数値文字列なら number を返し、その他は null
function parseNumberish(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

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

    // 数値フィールドの正規化
    const nRoomSize = parseNumberish(roomSize);
    if (nRoomSize === null) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request', detail: 'invalid roomSize' },
        { status: 400, headers: noStore }
      );
    }

    const nTurnSeconds = parseNumberish(turnSeconds);
    if (nTurnSeconds === null) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request', detail: 'invalid turnSeconds' },
        { status: 400, headers: noStore }
      );
    }

    const nMaxCucumbers = parseNumberish(maxCucumbers);
    if (nMaxCucumbers === null) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request', detail: 'invalid maxCucumbers' },
        { status: 400, headers: noStore }
      );
    }

    // 共有ストレージが無い環境では原則ブロックするが、開発用メモリフォールバックが許可される場合は通す
    const allowMemoryFallback = isDevelopmentWithMemoryFallback();
    if (!HAS_SHARED_STORE && !allowMemoryFallback) {
      console.warn('[API] No shared store available and memory fallback not allowed. Blocking request.');
      return NextResponse.json({ ok: false, reason: 'no-shared-store' }, { status: 503, headers: noStore });
    }

    // バリデーション
    if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400, headers: noStore }
      );
    }

    if (!nRoomSize || nRoomSize < 2 || nRoomSize > 6) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request', detail: 'invalid roomSize' },
        { status: 400, headers: noStore }
      );
    }

    if (nTurnSeconds < 0) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request', detail: 'invalid turnSeconds' },
        { status: 400, headers: noStore }
      );
    }

    if (!nMaxCucumbers || nMaxCucumbers < 4 || nMaxCucumbers > 7) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request', detail: 'invalid maxCucumbers' },
        { status: 400, headers: noStore }
      );
    }

    // ルーム作成（共有ストア優先、共有ストアが無い環境ではメモリ禁止＝クライアント同期へ誘導）
    // 6桁IDを重複しないように最大100回まで試行
    let id = '';
    for (let i = 0; i < 100; i++) {
      const cand = String(Math.floor(100000 + Math.random() * 900000));
      const existsInFirestore = await getRoomById?.(cand);
      const existsInRedis = await getRoomByIdRedis?.(cand);
      const exists = existsInFirestore || existsInRedis;
      if (!exists) { id = cand; break; }
    }
    if (!id) {
      return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500, headers: noStore });
    }
    const room: Room = {
      id,
      size: nRoomSize,
      seats: Array.from({ length: nRoomSize }, () => null),
      status: 'waiting',
      createdAt: Date.now(),
      turnSeconds: nTurnSeconds,
      maxCucumbers: nMaxCucumbers
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
    const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

    let persisted = false;
    let storageUsed = '';

    console.log('[API] Storage availability:', { firestore: hasFirestoreEnv, redis: hasRedisAvailable, HAS_SHARED_STORE, allowMemoryFallback, isProd });

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
      if (allowMemoryFallback && !isProd) {
        console.warn('[API] Persist failed; using memory fallback for development');
        try { putRoomToMemory(room); persisted = true; storageUsed = 'memory-fallback'; }
        catch (e) { console.error('[API] Memory fallback putRoom failed:', e); }
      }
      if (!persisted) {
        return NextResponse.json({ ok: false, reason: 'no-shared-store' }, { status: 503, headers: noStore });
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

    return NextResponse.json({ ok: true, roomId, storage: storageUsed || 'unknown' }, { status: 200, headers: noStore });

  } catch (error) {
    console.error('Room creation error:', error);
    return NextResponse.json(
      { ok: false, reason: 'server-error', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: noStore }
    );
  }
}

