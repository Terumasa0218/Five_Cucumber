import { apply, projectViewFor, validate } from '@/lib/engine';
import type { Move } from '@/lib/game-core';
import { hashState } from '@/lib/hashState';
import { realtime } from '@/lib/realtime';
import { redis, isRedisAvailable } from '@/lib/redis';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth } from '@/lib/auth';

export const runtime = 'nodejs';

interface LockStore {
  locks: Map<string, string>;
}

declare global {
  // eslint-disable-next-line no-var
  var __locks: LockStore['locks'] | undefined;
}

async function withRoomLock<T>(roomId: string, fn: () => Promise<T>) {
  const key = `lock:room:${roomId}`;
  const token = randomUUID();
  if (isRedisAvailable()) {
    const ok = await redis.set(key, token, { nx: true, ex: 2 });
    if (ok !== 'OK') throw new Error('ROOM_BUSY');
  } else {
    if (!globalThis.__locks) {
      globalThis.__locks = new Map<string, string>();
    }
    const locks = globalThis.__locks;
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
      const locks = globalThis.__locks;
      if (locks?.get(key) === token) locks.delete(key);
    }
  }
}

// Move型のzodスキーマ
const MoveSchema: z.ZodType<Move> = z.object({
  player: z.number().int().nonnegative(),
  card: z.number().int().min(1).max(15),
  timestamp: z.number().int().nonnegative(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const schema = z.object({
      roomId: z.string().min(1),
      userId: z.string().min(1),
      opId: z.string().min(1),
      baseV: z.number().int().nonnegative(),
      action: MoveSchema,
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
        const dedup = await redis.set(`op:${roomId}:${opId}`, 1, { nx: true, ex: 60 });
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
        if (!globalThis.__mem) {
          globalThis.__mem = new Map<string, unknown>();
        }
        const mem = globalThis.__mem;
        vNow = mem.has(`room:${roomId}:v`) ? (mem.get(`room:${roomId}:v`) as number | null) : null;
        seatsStr = (mem.get(`room:${roomId}:seats`) as string | undefined) ?? null;
        stateStr = (mem.get(`room:${roomId}:state`) as string | undefined) ?? null;
      }
      if (vNow === null || !seatsStr || !stateStr) throw new Error('GAME_NOT_FOUND');
      if (vNow !== baseV) throw new Error('STALE_VERSION');
      const seats = JSON.parse(seatsStr) as string[];
      const state = JSON.parse(stateStr);

      const actorSeat = seats.indexOf(userId);
      // GameAction形式に変換（type: 'move'を追加）
      const gameAction = { type: 'move', ...action };
      if (actorSeat < 0 || !validate(state, gameAction, actorSeat)) throw new Error('INVALID_MOVE');

      const next = apply(state, gameAction);
      const v = vNow + 1;
      if (isRedisAvailable()) {
        await Promise.all([
          redis.set(`room:${roomId}:state`, JSON.stringify(next)),
          redis.set(`room:${roomId}:v`, v),
        ]);
      } else {
        if (!globalThis.__mem) {
          globalThis.__mem = new Map<string, unknown>();
        }
        const mem = globalThis.__mem;
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
    const error = e instanceof Error ? e : new Error('Unknown error');
    const code = error.message ?? 'SERVER_ERROR';
    const status = code === 'STALE_VERSION' ? 409 : code === 'INVALID_MOVE' ? 400 : code === 'ROOM_BUSY' ? 423 : 500;
    return NextResponse.json({ error: String(code) }, { status });
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __mem: Map<string, unknown> | undefined;
}


