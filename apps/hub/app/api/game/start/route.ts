import { initGame, projectViewFor } from '@/lib/engine';
import { hashState } from '@/lib/hashState';
import { realtime } from '@/lib/realtime';
import { redis, isRedisAvailable } from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const schema = z.object({ roomId: z.string().min(1), seats: z.array(z.string().min(1)).min(2) });
    const { roomId, seats } = schema.parse(await req.json());

    if (!process.env.ABLY_API_KEY) {
      console.error('[Game Start] ABLY_API_KEY environment variable is not set');
      return NextResponse.json({ error: 'MISCONFIGURED_ENV' }, { status: 500 });
    }

    console.log('[Game Start] Starting game for room:', roomId, 'seats:', seats);
    const seed = `${Date.now()}:${roomId}`;
    const state = initGame(seats, seed);
    // KV未構成環境ではインメモリーに退避（開発用）。本番はKV必須。
    if (isRedisAvailable()) {
      await Promise.all([
        redis.set(`room:${roomId}:state`, JSON.stringify(state)),
        redis.set(`room:${roomId}:v`, 0),
        redis.set(`room:${roomId}:seats`, JSON.stringify(seats)),
      ]);
    } else {
      const isProd = process.env.VERCEL === '1' || !!process.env.VERCEL_ENV;
      if (isProd) {
        console.error('[Game Start] KV not available in production');
        return NextResponse.json({ error: 'KV_NOT_AVAILABLE' }, { status: 500 });
      }
      interface MemoryStore {
        __mem?: Map<string, string | number>;
      }
      const globalMem = globalThis as MemoryStore;
      globalMem.__mem = globalMem.__mem || new Map<string, string | number>();
      const mem = globalMem.__mem;
      mem.set(`room:${roomId}:state`, JSON.stringify(state));
      mem.set(`room:${roomId}:v`, 0);
      mem.set(`room:${roomId}:seats`, JSON.stringify(seats));
    }
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


