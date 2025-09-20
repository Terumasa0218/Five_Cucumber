// ルーム情報取得API

import { getRoomById } from '@/lib/roomsStore';
import { getRoomByIdRedis } from '@/lib/roomsRedis';
import { getRoomFromMemory } from '@/lib/roomSystemUnified';
import { isRedisAvailable } from '@/lib/redis';
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

    const hasRedisAvailable = isRedisAvailable();
    const isProd = process.env.VERCEL === '1' || !!process.env.VERCEL_ENV;
    let room = await getRoomById(roomId);
    console.log('[API] Room lookup - Firestore:', room ? 'found' : 'not found');

    if (!room && hasRedisAvailable) {
      room = await getRoomByIdRedis(roomId);
      console.log('[API] Room lookup - Redis/KV:', room ? 'found' : 'not found');
    }

    if (!room && !isProd) {
      room = getRoomFromMemory(roomId);
      console.log('[API] Room lookup - Memory:', room ? 'found' : 'not found');
    }
    
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
