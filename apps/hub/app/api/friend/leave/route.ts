import { NextRequest, NextResponse } from 'next/server';
import { getRoomById } from '@/lib/roomsStore';
import { getRoomByIdRedis } from '@/lib/roomsRedis';
import { persistRoomToStores } from '@/lib/persistRoom';

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
      try {
        await persistRoomToStores(room, 'friend/leave');
      } catch (persistError) {
        const reason = persistError instanceof Error ? persistError.message : 'persist-failed';
        console.error('[API] leaveRoom persistence failed:', persistError);
        return NextResponse.json({ ok: false, reason }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[API] leave room error:', error);
    return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500 });
  }
}


