import { NextRequest, NextResponse } from 'next/server';
import { updateRoom } from '@/lib/roomsStore';
import { updateRoomRedis } from '@/lib/roomsRedis';
import { updateRoomStatus, getRoomFromMemory, putRoomToMemory } from '@/lib/roomSystemUnified';
import { isRedisAvailable } from '@/lib/redis';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { roomId, status } = body as { roomId?: string; status?: 'waiting' | 'playing' | 'closed' };

    if (!roomId || !status) {
      return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 });
    }

    const hasRedisAvailable = isRedisAvailable();
    const isProd = process.env.VERCEL_ENV === 'production';
    let storageUsed = '';

    try {
      await updateRoom(roomId.trim(), { status });
      storageUsed = 'Firestore';
      console.log('[API] Status updated in Firestore successfully');
      return NextResponse.json({ ok: true }, { status: 200 });
    } catch (e) {
      console.log('[API] Firestore update failed, trying other storage');

      if (hasRedisAvailable) {
        const updated = await updateRoomRedis(roomId.trim(), { status } as any);
        if (updated) {
          storageUsed = 'Redis/KV';
          console.log('[API] Status updated in Redis/KV successfully');
          return NextResponse.json({ ok: true }, { status: 200 });
        }
      }

      // 本番ではメモリフォールバック禁止
      if (!isProd) {
        console.log('[API] No persistent storage available for status, using memory fallback');
        const memoryRoom = getRoomFromMemory(roomId.trim());
        if (memoryRoom) {
          memoryRoom.status = status;
          putRoomToMemory(memoryRoom);
          storageUsed = 'Memory';
          console.log('[API] Status updated in memory successfully');
          return NextResponse.json({ ok: true }, { status: 200 });
        }
      }

      const ok = updateRoomStatus(roomId.trim(), status);
      if (!ok) {
        return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 });
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }
  } catch (error) {
    console.error('[API] status update error:', error);
    return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500 });
  }
}


