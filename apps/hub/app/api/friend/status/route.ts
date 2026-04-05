import { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { json } from '@/lib/http';
import type { Room, RoomStatus } from '@/types/room';
import { kvGetJSON, kvSaveJSON, roomTTL } from '@/lib/kv';
import { verifyAuth } from '@/lib/auth';
import { withLock } from '@/lib/lock';

const keyOf = (id: string) => `friend:room:${id}`;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type StatusPayload = { roomId?: unknown; status?: unknown };

const isRoomStatus = (value: string): value is RoomStatus =>
  value === 'waiting' || value === 'playing' || value === 'closed';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  try {
    const body = (await req.json()) as StatusPayload;
    const roomId = typeof body.roomId === 'string' ? body.roomId.trim() : '';
    const statusInput = typeof body.status === 'string' ? body.status.trim() : '';

    if (!roomId || !statusInput || !isRoomStatus(statusInput)) {
      return json({ ok: false, reason: 'bad-request' }, 400);
    }

    return await withLock(`room:${roomId}`, async () => {
      const room = await kvGetJSON<Room>(keyOf(roomId));
      if (!room) {
        return json({ ok: false, reason: 'not-found' }, 404);
      }

      // 無効な状態遷移を防止
      const validTransitions: Record<string, string[]> = {
        waiting: ['playing', 'closed'],
        playing: ['closed'],
        closed: [],
      };
      if (!validTransitions[room.status]?.includes(statusInput)) {
        return json({ ok: false, reason: 'invalid-transition' }, 409);
      }

      room.status = statusInput;
      await kvSaveJSON(keyOf(roomId), room, roomTTL);

      return json({ ok: true }, 200);
    }, { ttlMs: 5000, retry: 2, retryDelayMs: 100 });
  } catch (error) {
    console.error('[API] status update error:', error);
    return json({ ok: false, reason: 'server-error' }, 500);
  }
}
