import { joinRoom } from '@/lib/roomSystem';
import { JoinRoomRequest, RoomResponse } from '@/types/room';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest): Promise<NextResponse<RoomResponse>> {
  try {
    const body: JoinRoomRequest = await req.json();
    const { roomId, nickname } = body;

    // バリデーション
    if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400 }
      );
    }

    if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
      return NextResponse.json(
        { ok: false, reason: 'bad-request' },
        { status: 400 }
      );
    }

    // ルーム参加
    const result = joinRoom(roomId.trim(), nickname);

    if (!result.success) {
      let status = 400;
      switch (result.reason) {
        case 'not-found':
          status = 404;
          break;
        case 'full':
          status = 409;
          break;
        case 'locked':
          status = 423;
          break;
        default:
          status = 400;
      }

      return NextResponse.json(
        { ok: false, reason: result.reason },
        { status }
      );
    }

    return NextResponse.json(
      { ok: true, roomId: result.roomId },
      { status: 200 }
    );

  } catch (error) {
    console.error('Room join error:', error);
    return NextResponse.json(
      { ok: false, reason: 'server-error' },
      { status: 500 }
    );
  }
}

