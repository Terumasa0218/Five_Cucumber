import { updateRoomStatus } from '@/lib/roomSystemUnified';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { roomId, status } = body as { roomId?: string; status?: 'waiting' | 'playing' | 'closed' };

    if (!roomId || !status) {
      return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 });
    }

    const ok = updateRoomStatus(roomId.trim(), status);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[API] status update error:', error);
    return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500 });
  }
}


