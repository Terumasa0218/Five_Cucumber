import { leaveRoom } from '@/lib/roomSystemUnified';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { roomId, nickname } = body as { roomId?: string; nickname?: string };

    if (!roomId || !nickname || !nickname.trim()) {
      return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 });
    }

    const ok = leaveRoom(roomId.trim(), nickname.trim());
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[API] leave room error:', error);
    return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500 });
  }
}


