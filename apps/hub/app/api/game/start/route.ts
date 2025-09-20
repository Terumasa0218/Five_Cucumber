import { initGame, projectViewFor } from '@/lib/engine';
import { hashState } from '@/lib/hashState';
import { realtime } from '@/lib/realtime';
import { getRedis } from '@/lib/redis';
import { ROOM_TTL_SECONDS } from '@/lib/roomsRedis';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const schema = z.object({ roomId: z.string().min(1), seats: z.array(z.string().min(1)).min(2) });
    const { roomId, seats } = schema.parse(await req.json());
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN || !process.env.ABLY_API_KEY) {
      return NextResponse.json({ error: 'MISCONFIGURED_ENV' }, { status: 500 });
    }
    const redis = getRedis();
    if (!redis) {
      return NextResponse.json({ error: 'MISCONFIGURED_ENV' }, { status: 500 });
    }
    const seed = `${Date.now()}:${roomId}`;
    const state = initGame(seats, seed);
    await Promise.all([
      redis.set(`room:${roomId}:state`, JSON.stringify(state), { ex: ROOM_TTL_SECONDS }),
      redis.set(`room:${roomId}:v`, 0, { ex: ROOM_TTL_SECONDS }),
      redis.set(`room:${roomId}:seats`, JSON.stringify(seats), { ex: ROOM_TTL_SECONDS }),
    ]);
    const v = 0;

    await realtime.publishToMany(roomId, seats, 'game_started', (uid) => {
      const view = projectViewFor(state as any, uid);
      return { v, state: view, h: hashState(view) };
    });
    return NextResponse.json({ ok: true, v }, { status: 200 });
  } catch (e) {
    console.error('[game/start]', e);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}


