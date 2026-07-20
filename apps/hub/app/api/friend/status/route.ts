import { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { json } from '@/lib/http';
import type { Room, RoomStatus } from '@/types/room';
import { kvGetJSON, kvSaveJSON, roomTTL } from '@/lib/kv';
import { getAuthFailureBody, getAuthFailureStatus, verifyAuthDetailed } from '@/lib/auth';
import { withLock } from '@/lib/lock';
import { canStartRoom, normalizeNickname, normalizeRoomId } from '@/lib/friend-room';

const keyOf = (id: string) => `friend:room:${id}`;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type StatusPayload = { roomId?: unknown; status?: unknown; nickname?: unknown };

const isRoomStatus = (value: string): value is RoomStatus =>
  value === 'waiting' || value === 'playing' || value === 'closed';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuthDetailed(req);
  if (!auth.ok) return json(getAuthFailureBody(auth.detail), getAuthFailureStatus(auth.detail.reason));
  try {
    const body = (await req.json()) as StatusPayload;
    const roomId = normalizeRoomId(body.roomId);
    const statusInput = typeof body.status === 'string' ? body.status.trim() : '';
    const nickname = normalizeNickname(body.nickname);

    if (roomId.length !== 6 || !statusInput || !isRoomStatus(statusInput) || !nickname) {
      return json({ ok: false, reason: 'bad-request' }, 400);
    }

    return await withLock(`room:${roomId}`, async () => {
      const room = await kvGetJSON<Room>(keyOf(roomId));
      if (!room) {
        return json({ ok: false, reason: 'not-found' }, 404);
      }

      if (statusInput === 'playing') {
        const startCheck = canStartRoom(room, nickname);
        if (!startCheck.ok) {
          return json({ ok: false, reason: startCheck.reason }, startCheck.reason === 'host-only' ? 403 : 409);
        }
      }

      if (statusInput === 'closed' && !room.seats.some((seat) => seat?.nickname === nickname)) {
        return json({ ok: false, reason: 'not-member' }, 403);
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
