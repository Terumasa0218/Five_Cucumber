import { apply, projectViewFor, validate } from '@/lib/engine';
import type { Move } from '@/lib/game-core';
import { hashState } from '@/lib/hashState';
import { realtime } from '@/lib/realtime';
import { kv, kvGetJSON, kvSaveJSON, gameTTL } from '@/lib/kv';
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
  const key = `lock:game-room:${roomId}`;
  const token = randomUUID();
  if (!globalThis.__locks) globalThis.__locks = new Map<string, string>();
  const locks = globalThis.__locks;
  if (locks.has(key)) throw new Error('ROOM_BUSY');
  locks.set(key, token);
  try {
    return await fn();
  } finally {
    if (locks.get(key) === token) locks.delete(key);
  }
}

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
      return NextResponse.json({ error: 'MISCONFIGURED_ENV' }, { status: 500 });
    }

    const res = await withRoomLock(roomId, async () => {
      const dedup = await kv.set(`game:op:${roomId}:${opId}`, 1, { nx: true, ex: 60 });
      if (dedup !== 'OK') {
        const v = await kvGetJSON<number>(`game:room:${roomId}:v`);
        return { v, dedup: true };
      }

      const [vNow, seats, stateRaw] = await Promise.all([
        kvGetJSON<number>(`game:room:${roomId}:v`),
        kvGetJSON<string[]>(`game:room:${roomId}:seats`),
        kvGetJSON(`game:room:${roomId}:state`),
      ]);

      if (vNow === null || !seats || !stateRaw) throw new Error('GAME_NOT_FOUND');
      const state = stateRaw as any;
      if (vNow !== baseV) throw new Error('STALE_VERSION');

      const actorSeat = seats.indexOf(userId);
      const gameAction = { type: 'move', ...action };
      if (actorSeat < 0 || !validate(state, gameAction, actorSeat)) throw new Error('INVALID_MOVE');

      const next = apply(state, gameAction);
      const v = vNow + 1;

      await Promise.all([
        kvSaveJSON(`game:room:${roomId}:state`, next, gameTTL),
        kvSaveJSON(`game:room:${roomId}:v`, v, gameTTL),
        kvSaveJSON(`game:room:${roomId}:seats`, seats, gameTTL),
      ]);

      await realtime.publishToMany(roomId, seats, 'state_patch', (uid) => {
        const view = projectViewFor(next, uid);
        return { v, state: view, h: hashState(view) };
      });

      return { v };
    });

    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    const error = e instanceof Error ? e : new Error('Unknown error');
    const code = error.message ?? 'SERVER_ERROR';
    const status = code === 'STALE_VERSION' ? 409 : code === 'INVALID_MOVE' ? 400 : code === 'ROOM_BUSY' ? 423 : code === 'GAME_NOT_FOUND' ? 404 : 500;
    return NextResponse.json({ error: String(code) }, { status });
  }
}
