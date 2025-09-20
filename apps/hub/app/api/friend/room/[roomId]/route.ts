// ルーム情報取得API

import { getRoomById } from '@/lib/roomsStore';
import { getRoomByIdRedis } from '@/lib/roomsRedis';
// 共有ストアに統一するため、メモリフォールバックは使用しない
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    let room = await getRoomByIdRedis(roomId);
    if (!room) {
      room = await getRoomById(roomId);
    }
    // メモリフォールバックは serverless で分断されるため使用しない
    
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
