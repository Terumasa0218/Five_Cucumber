import { NextRequest, NextResponse } from 'next/server';
import { updateRoom } from '@/lib/roomsStore';
import { updateRoomRedis } from '@/lib/roomsRedis';
import { updateRoomStatus, getRoomFromMemory, putRoomToMemory } from '@/lib/roomSystemUnified';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { roomId, status } = body as { roomId?: string; status?: 'waiting' | 'playing' | 'closed' };

    if (!roomId || !status) {
      return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 });
    }

    try {
      await updateRoom(roomId.trim(), { status });
      return NextResponse.json({ ok: true }, { status: 200 });
    } catch (e) {
      const updated = await updateRoomRedis(roomId.trim(), { status } as any);
      if (updated) return NextResponse.json({ ok: true }, { status: 200 });

      // メモリフォールバック
      const memoryRoom = getRoomFromMemory(roomId.trim());
      if (memoryRoom) {
        memoryRoom.status = status;
        putRoomToMemory(memoryRoom);
        return NextResponse.json({ ok: true }, { status: 200 });
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


