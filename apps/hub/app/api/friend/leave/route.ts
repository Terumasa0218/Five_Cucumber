import { NextRequest, NextResponse } from 'next/server';
import { getRoomById, putRoom } from '@/lib/roomsStore';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { roomId, nickname } = body as { roomId?: string; nickname?: string };

    if (!roomId || !nickname || !nickname.trim()) {
      return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 });
    }

    const rid = roomId.trim();
    const name = nickname.trim();
    const room = await getRoomById(rid);
    if (!room) {
      return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 });
    }
    const idx = room.seats.findIndex(s => s?.nickname === name);
    if (idx >= 0) {
      room.seats[idx] = null;
      await putRoom(room);
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[API] leave room error:', error);
    return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500 });
  }
}


