import { getRoomByIdRedis } from '@/lib/roomsRedis';
import { getRoomByIdStrict, RoomStoreError } from '@/lib/roomsStore';
import { persistRoomToStores } from '@/lib/persistRoom';
import { JoinRoomRequest, RoomResponse } from '@/types/room';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    try {
      // ルーム参加（共有ストア優先: Redis -> Firestore）
      const rid = roomId.trim();
      let room = await getRoomByIdRedis(rid);
      let storeError: RoomStoreError | null = null;
      if (!room) {
        try {
          room = await getRoomByIdStrict(rid);
        } catch (error) {
          if (error instanceof RoomStoreError) {
            storeError = error;
          } else {
            throw error;
          }
        }
      }

      if (!room) {
        if (storeError) {
          const reason = storeError.code === 'permission-denied' ? 'rooms-store-forbidden' : 'rooms-store-unavailable';
          return NextResponse.json({ ok: false, reason }, { status: 500 });
        }
        throw new Error('not-found');
      }
      if (room.status !== 'waiting') {
        return NextResponse.json({ ok: false, reason: 'locked' }, { status: 423 });
      }

      const trimmedNickname = nickname.trim();
      const already = room.seats.some(s => s?.nickname === trimmedNickname);
      if (!already) {
        const emptyIndex = room.seats.findIndex(s => s === null);
        if (emptyIndex === -1) {
          return NextResponse.json({ ok: false, reason: 'full' }, { status: 409 });
        }

        room.seats[emptyIndex] = { nickname: trimmedNickname };

        try {
          await persistRoomToStores(room, 'friend/join');
        } catch (persistError) {
          const reason = persistError instanceof Error ? persistError.message : 'persist-failed';
          throw new Error(reason);
        }
      }
      return NextResponse.json({ ok: true, roomId: rid, room }, { status: 200 });
    } catch (e) {
      // 共有ストアに無い場合は明確に not-found を返す（serverless間での分断を可視化）
      const msg = (e as Error)?.message;
      const status = msg === 'not-found' ? 404 : msg === 'full' ? 409 : msg === 'locked' ? 423 : 500;
      return NextResponse.json({ ok: false, reason: msg ?? 'server-error' }, { status });
    }

  } catch (error) {
    console.error('Room join error:', error);
    return NextResponse.json(
      { ok: false, reason: 'server-error' },
      { status: 500 }
    );
  }
}

