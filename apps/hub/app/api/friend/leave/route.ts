import { NextRequest, NextResponse } from 'next/server';
import { getRoomById, putRoom } from '@/lib/roomsStore';
import { getRoomByIdRedis, putRoomRedis } from '@/lib/roomsRedis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { roomId, nickname } = body as { roomId?: string; nickname?: string };

    if (!roomId || !nickname || !nickname.trim()) {
      return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 });
    }

    const rid = roomId.trim();
    const name = nickname.trim();
    let room = await getRoomByIdRedis(rid);
    if (!room) {
      room = await getRoomById(rid);
    }
    if (!room) {
      return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 });
    }
    const idx = room.seats.findIndex(s => s?.nickname === name);
    if (idx >= 0) {
      room.seats[idx] = null;
      const hasFirestoreEnv = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const hasRedisEnv = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
      const persistTasks: Array<Promise<void>> = [];

      if (hasFirestoreEnv) {
        persistTasks.push(
          putRoom(room).catch((err) => {
            console.warn('[API] leaveRoom Firestore putRoom failed:', err instanceof Error ? err.message : err);
            throw err;
          })
        );
      }

      if (hasRedisEnv) {
        persistTasks.push(
          putRoomRedis(room).catch((err) => {
            console.warn('[API] leaveRoom Redis putRoom failed:', err instanceof Error ? err.message : err);
            throw err;
          })
        );
      }

      if (persistTasks.length === 0) {
        return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500 });
      }

      const results = await Promise.allSettled(persistTasks);
      if (!results.some(r => r.status === 'fulfilled')) {
        return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[API] leave room error:', error);
    return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500 });
  }
}


