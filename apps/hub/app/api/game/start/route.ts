import { initGame, projectViewFor } from '@/lib/engine';
import { realtime } from '@/lib/realtime';
import { hashState } from '@/lib/hashState';
import { redis } from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { roomId, seats } = await req.json();
    if (!roomId || !Array.isArray(seats) || seats.length < 2) {
      return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 });
    }
    const seed = `${Date.now()}:${roomId}`;
    const state = initGame(seats, seed);
    await Promise.all([
      redis.set(`room:${roomId}:state`, JSON.stringify(state)),
      redis.set(`room:${roomId}:v`, 0),
      redis.set(`room:${roomId}:seats`, JSON.stringify(seats)),
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


