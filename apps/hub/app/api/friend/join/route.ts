export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { getRoomByIdRedis, putRoomRedis } from '@/lib/roomsRedis';
import { getRoomById, putRoom } from '@/lib/roomsStore';
import { getRoomFromMemory, putRoomToMemory } from '@/lib/roomSystemUnified';
import { HAS_SHARED_STORE } from '@/lib/serverSync';
import { isRedisAvailable, redis } from '@/lib/redis';
import { realtime } from '@/lib/realtime';
import { JoinRoomRequest, Room, RoomResponse, RoomSeat } from '@/types/room';
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const keyOf = (id: string) => `friend:room:${id}`;
const noStore = { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' } as const;

type JoinRoomPayload = Partial<JoinRoomRequest> & { code?: unknown; roomCode?: unknown };

const isOccupiedSeat = (seat: RoomSeat): seat is Exclude<RoomSeat, null> => seat !== null;

export async function POST(req: NextRequest): Promise<NextResponse<RoomResponse>> {
  try {
    const raw = (await req.json()) as JoinRoomPayload;
    const nicknameInput = typeof raw.nickname === 'string' ? raw.nickname.trim() : '';
    const roomIdCandidate = raw.roomId ?? raw.code ?? raw.roomCode;
    const roomId = roomIdCandidate === undefined || roomIdCandidate === null ? '' : String(roomIdCandidate).trim();

    if (!nicknameInput) {
      return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400, headers: noStore });
    }
    if (!roomId) {
      return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400, headers: noStore });
    }

    const rid = roomId;
    const name = nicknameInput;

    // KVロック（あれば利用）
  const hasRedisAvailable = isRedisAvailable();
  const lockKey = `lock:room:${rid}:join`;
  const lockToken = `${Date.now()}:${Math.random()}`;
  let locked = false;
  if (hasRedisAvailable) {
    const ok = await redis.set(lockKey, lockToken, { nx: true, ex: 3 });
    if (ok !== 'OK') {
      return NextResponse.json({ ok: false, reason: 'busy' }, { status: 423 });
    }
    locked = true;
  }

    try {
      // 1) まず KV を読み、存在すればそこで read-modify-write
      try {
        const kvRoom = await kv.get<Room>(keyOf(rid));
        if (kvRoom) {
          if (kvRoom.status !== 'waiting') {
            return NextResponse.json({ ok: false, reason: 'locked' }, { status: 423, headers: noStore });
          }
          const already = kvRoom.seats.some((seat) => seat?.nickname === name);
          if (!already) {
            const emptyIndex = kvRoom.seats.findIndex((seat) => seat === null);
            if (emptyIndex === -1) return NextResponse.json({ ok: false, reason: 'full' }, { status: 409, headers: noStore });
            kvRoom.seats[emptyIndex] = { nickname: name };
            await kv.set(keyOf(rid), kvRoom, { ex: 60 * 30 });
          }

          // ブロードキャスト
          try {
            const members = kvRoom.seats.filter(isOccupiedSeat).map((seat) => seat.nickname);
            await realtime.publishToMany(rid, members, 'room_updated', () => ({ room: kvRoom, event: 'player_joined', joinedPlayer: name }));
          } catch {}

          return NextResponse.json({ ok: true, roomId: rid, room: kvRoom }, { status: 200, headers: noStore });
        }
      } catch (e) {
        console.warn('[API] join: KV get failed, falling back:', e);
      }

      // 2) KVが無い場合は既存ストアから取得し、更新後に必ずKVへ同期（共有ストアが無い場合はメモリ禁止）
      let room = await getRoomById(rid);
      if (!room) room = await getRoomByIdRedis(rid);
      if (!room && HAS_SHARED_STORE) room = getRoomFromMemory(rid);
      if (!room) return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404, headers: noStore });
      if (room.status !== 'waiting') return NextResponse.json({ ok: false, reason: 'locked' }, { status: 423, headers: noStore });

      const already = room.seats.some(s => s?.nickname === name);
      if (!already) {
        const emptyIndex = room.seats.findIndex(s => s === null);
        if (emptyIndex === -1) return NextResponse.json({ ok: false, reason: 'full' }, { status: 409, headers: noStore });
        room.seats[emptyIndex] = { nickname: name };
      }

      // 既存ストア（参考用）
      const hasFirestoreEnv = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const isProd = process.env.VERCEL_ENV === 'production';
      if (hasFirestoreEnv) { try { await putRoom(room); } catch {} }
      if (hasRedisAvailable) { try { await putRoomRedis(room); } catch {} }
      if (!hasFirestoreEnv && !hasRedisAvailable && !isProd && HAS_SHARED_STORE) { putRoomToMemory(room); }

      // 3) 最後に必ずKVへ書き戻す
      try {
        await kv.set(keyOf(rid), room, { ex: 60 * 30 });
      } catch (e) {
        console.warn('[API] join: KV set failed:', e);
      }

      // ブロードキャスト
      try {
        const members = room.seats.filter(isOccupiedSeat).map((seat) => seat.nickname);
        await realtime.publishToMany(rid, members, 'room_updated', () => ({ room, event: 'player_joined', joinedPlayer: name }));
      } catch {}

      return NextResponse.json({ ok: true, roomId: rid, room }, { status: 200, headers: noStore });
    } finally {
      if (locked) {
        try {
          const v = await redis.get<string>(lockKey);
          if (v === lockToken) await redis.del(lockKey);
        } catch {}
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : undefined;
    const status = message === 'not-found'
      ? 404
      : message === 'full'
        ? 409
        : message === 'locked'
          ? 423
          : message === 'persist-failed'
            ? 500
            : 500;
    return NextResponse.json({ ok: false, reason: message ?? 'server-error' }, { status, headers: noStore });
  }
}

