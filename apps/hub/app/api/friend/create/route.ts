import { createRoom } from '@/lib/roomSystemUnified';
import { CreateRoomRequest, RoomResponse } from '@/types/room';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest): Promise<NextResponse<RoomResponse>> {
  try {
    // リクエストボディの取得と検証
    let body: CreateRoomRequest;
    try {
      const text = await req.text();
      console.log('[API] Raw request body:', text);
      
      if (!text || text.trim() === '') {
        throw new Error('Empty request body');
      }
      
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('[API] JSON parse error:', parseError);
      return NextResponse.json(
        { ok: false, reason: 'invalid-json', detail: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { roomSize, nickname, turnSeconds, maxCucumbers } = body;

    // バリデーション
    if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400 }
      );
    }

    if (!roomSize || typeof roomSize !== 'number' || roomSize < 2 || roomSize > 6) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400 }
      );
    }

    if (typeof turnSeconds !== 'number' || turnSeconds < 0) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400 }
      );
    }

    if (!maxCucumbers || typeof maxCucumbers !== 'number' || maxCucumbers < 4 || maxCucumbers > 6) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400 }
      );
    }

    // ルーム作成
    const result = createRoom(roomSize, nickname, turnSeconds, maxCucumbers);

    if (!result.success) {
      return NextResponse.json(
        { ok: false, reason: result.reason },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: true, roomId: result.roomId },
      { status: 200 }
    );

  } catch (error) {
    console.error('Room creation error:', error);
    return NextResponse.json(
      { ok: false, reason: 'server-error', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

