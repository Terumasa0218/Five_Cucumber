import { apply, projectViewFor, validate } from '@/lib/engine';
import { hashState } from '@/lib/hashState';
import { realtime } from '@/lib/realtime';
import { redis, isRedisAvailable } from '@/lib/redis';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

async function withRoomLock<T>(roomId: string, fn: () => Promise<T>) {
  const key = `lock:room:${roomId}`;
  const token = randomUUID();
  if (isRedisAvailable()) {
    const ok = await redis.set(key, token, { nx: true, ex: 2 } as any);
    if (ok !== 'OK') throw new Error('ROOM_BUSY');
  } else {
    (globalThis as any).__locks = (globalThis as any).__locks || new Map<string, string>();
    const locks = (globalThis as any).__locks as Map<string, string>;
    if (locks.has(key)) throw new Error('ROOM_BUSY');
    locks.set(key, token);
  }
  try {
    return await fn();
  } finally {
    if (isRedisAvailable()) {
      const v = await redis.get<string>(key);
      if (v === token) await redis.del(key);
    } else {
      const locks = (globalThis as any).__locks as Map<string, string>;
      if (locks?.get(key) === token) locks.delete(key);
    }
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const schema = z.object({
      roomId: z.string().min(1),
      userId: z.string().min(1),
      opId: z.string().min(1),
      baseV: z.number().int().nonnegative(),
      action: z.any(),
    });
    const { roomId, userId, opId, baseV, action } = schema.parse(await req.json());

    if (!process.env.ABLY_API_KEY) {
      console.error('[Game Move] ABLY_API_KEY environment variable is not set');
      return NextResponse.json({ error: 'MISCONFIGURED_ENV' }, { status: 500 });
    }

    console.log('[Game Move] Processing move for room:', roomId, 'user:', userId, 'opId:', opId);
    const res = await withRoomLock(roomId, async () => {
      let vNow: number | null = null;
      let seatsStr: string | null = null;
      let stateStr: string | null = null;
      if (isRedisAvailable()) {
        const dedup = await redis.set(`op:${roomId}:${opId}`, 1, { nx: true, ex: 60 } as any);
        if (dedup !== 'OK') {
          vNow = await redis.get<number>(`room:${roomId}:v`);
          return { v: vNow, dedup: true };
        }
        [vNow, seatsStr, stateStr] = await Promise.all([
          redis.get<number>(`room:${roomId}:v`),
          redis.get<string>(`room:${roomId}:seats`),
          redis.get<string>(`room:${roomId}:state`),
        ]);
      } else {
        const mem = ((globalThis as any).__mem ?? new Map<string, any>()) as Map<string, any>;
        (globalThis as any).__mem = mem;
        vNow = mem.has(`room:${roomId}:v`) ? mem.get(`room:${roomId}:v`) : null;
        seatsStr = mem.get(`room:${roomId}:seats`) ?? null;
        stateStr = mem.get(`room:${roomId}:state`) ?? null;
      }
      if (vNow === null || !seatsStr || !stateStr) throw new Error('GAME_NOT_FOUND');
      if (vNow !== baseV) throw new Error('STALE_VERSION');
      const seats = JSON.parse(seatsStr) as string[];
      const state = JSON.parse(stateStr);

      const actorSeat = seats.indexOf(userId);
      if (actorSeat < 0 || !validate(state, action, actorSeat)) throw new Error('INVALID_MOVE');

      const next = apply(state, action);
      const v = vNow + 1;
      if (isRedisAvailable()) {
        await Promise.all([
          redis.set(`room:${roomId}:state`, JSON.stringify(next)),
          redis.set(`room:${roomId}:v`, v),
        ]);
      } else {
        const mem = (globalThis as any).__mem as Map<string, any>;
        mem.set(`room:${roomId}:state`, JSON.stringify(next));
        mem.set(`room:${roomId}:v`, v);
      }

      await realtime.publishToMany(roomId, seats, 'state_patch', (uid) => {
        const view = projectViewFor(next, uid);
        return { v, state: view, h: hashState(view) };
      });

      return { v };
    });

    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    console.error('[game/move]', e);
    const code = (e as any)?.message ?? 'SERVER_ERROR';
    const status = code === 'STALE_VERSION' ? 409 : code === 'INVALID_MOVE' ? 400 : code === 'ROOM_BUSY' ? 423 : 500;
    return NextResponse.json({ error: String(code) }, { status });
  }
}


