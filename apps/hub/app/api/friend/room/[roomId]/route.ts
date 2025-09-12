// ルーム情報取得API

import { getRoom } from '@/lib/roomSystemUnified';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
): Promise<NextResponse> {
  try {
    const roomId = params.roomId;
    
    if (!roomId) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400 }
      );
    }

    const room = getRoom(roomId);
    
    if (!room) {
      return NextResponse.json(
        { ok: false, reason: 'not-found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: true, room },
      { status: 200 }
    );

  } catch (error) {
    console.error('Room get error:', error);
    return NextResponse.json(
      { ok: false, reason: 'server-error', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
