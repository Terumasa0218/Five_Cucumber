export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { kvExists, kvSaveJSON } from '@/lib/kv';
import { getRoomById } from '@/lib/roomsStore';
import { CreateRoomRequest, Room, RoomResponse } from '@/types/room';
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
    const hasKvConfig = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;
    if (!hasKvConfig) {
      console.warn('[API] KV not configured; rejecting room creation.');
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
      const existsInKv = await kvExists(`friend:room:${cand}`);
      const exists = existsInFirestore || existsInKv;
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

    const roomId = String(room.id ?? id);
    const key = `friend:room:${roomId}`;

    try {
      await kvSaveJSON(key, room, 60 * 60);
      const ok = await kvExists(key);
      if (!ok) {
        console.error('[API] KV verification failed for key:', key);
        return NextResponse.json(
          { ok: false, reason: 'persist-failed' },
          { status: 500, headers: noStore }
        );
      }
    } catch (e) {
      console.error('[API] KV persist failed:', e);
      return NextResponse.json(
        { ok: false, reason: 'persist-failed' },
        { status: 500, headers: noStore }
      );
    }

    return NextResponse.json({ ok: true, roomId, storage: 'kv' }, { status: 200, headers: noStore });

  } catch (error) {
    console.error('Room creation error:', error);
    return NextResponse.json(
      { ok: false, reason: 'server-error', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: noStore }
    );
  }
}

