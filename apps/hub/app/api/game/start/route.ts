import { initGame, projectViewFor } from '@/lib/engine';
import { hashState } from '@/lib/hashState';
import { realtime } from '@/lib/realtime';
import { kvSaveJSON, gameTTL } from '@/lib/kv';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const schema = z.object({ roomId: z.string().min(1), seats: z.array(z.string().min(1)).min(2) });
    const { roomId, seats } = schema.parse(await req.json());

    if (!process.env.ABLY_API_KEY) {
      console.error('[Game Start] ABLY_API_KEY environment variable is not set');
      return NextResponse.json({ error: 'MISCONFIGURED_ENV' }, { status: 500 });
    }

    const seed = `${Date.now()}:${roomId}`;
    const state = initGame(seats, seed);

    await Promise.all([
      kvSaveJSON(`game:room:${roomId}:state`, state, gameTTL),
      kvSaveJSON(`game:room:${roomId}:v`, 0, gameTTL),
      kvSaveJSON(`game:room:${roomId}:seats`, seats, gameTTL),
    ]);

    const v = 0;
    await realtime.publishToMany(roomId, seats, 'game_started', (uid) => {
      const view = projectViewFor(state, uid);
      return { v, state: view, h: hashState(view) };
    });
    return NextResponse.json({ ok: true, v }, { status: 200 });
  } catch (e) {
    console.error('[game/start]', e);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
