import { applyServerMove, getGame, initGame } from '@/lib/friendGameStore';
import { GameConfig, GameState, Move } from '@/lib/game-core';
import { NextRequest, NextResponse } from 'next/server';
import { json } from '@/lib/http';
import { verifyAuth } from '@/lib/auth';
import { withLock } from '@/lib/lock';
import { countJoinedPlayers, getSeatIndex, isRoomHost, normalizeNickname, normalizeRoomId } from '@/lib/friend-room';
import { kvGetJSON } from '@/lib/kv';
import type { Room } from '@/types/room';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type GameInitBody = {
  type: 'init';
  nickname?: unknown;
  state: GameState;
  config: GameConfig;
};

type GameMoveBody = {
  type: 'move';
  nickname?: unknown;
  move: Move;
};

type GameRequestBody = GameInitBody | GameMoveBody;

export async function GET(
  req: NextRequest,

  { params }: { params: { roomId: string } }
): Promise<NextResponse> {
  const auth = await verifyAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  try {
    const roomId = normalizeRoomId(params.roomId);
    const nickname = normalizeNickname(req.nextUrl.searchParams.get('nickname'));
    if (roomId.length !== 6 || !nickname) return json({ ok: false, reason: 'bad-request' }, 400);
    const room = await kvGetJSON<Room>(`friend:room:${roomId}`);
    if (!room) return json({ ok: false, reason: 'room-not-found' }, 404);
    if (getSeatIndex(room, nickname) < 0) return json({ ok: false, reason: 'not-member' }, 403);
    const snap = await getGame(roomId);
    if (!snap) return json({ ok: false, reason: 'not-found' }, 404);
    return json({ ok: true, snapshot: snap }, 200);
  } catch (e) {
    console.error('[friend/game GET] error:', e);
    return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,

  { params }: { params: { roomId: string } }
): Promise<NextResponse> {
  const auth = await verifyAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  try {
    const roomId = normalizeRoomId(params.roomId);
    if (roomId.length !== 6) return json({ ok: false, reason: 'bad-request' }, 400);
    
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, reason: 'bad-request' }, 400);
    }
    
    if (!body || typeof body !== 'object') {
      return json({ ok: false, reason: 'bad-request' }, 400);
    }
    
    const requestBody = body as Partial<GameRequestBody>;
    const nickname = normalizeNickname(requestBody.nickname);
    if (!nickname) return json({ ok: false, reason: 'bad-request' }, 400);

    const room = await kvGetJSON<Room>(`friend:room:${roomId}`);
    if (!room) return json({ ok: false, reason: 'room-not-found' }, 404);
    const actorSeatIndex = getSeatIndex(room, nickname);
    if (actorSeatIndex < 0) return json({ ok: false, reason: 'not-member' }, 403);
    
    if (requestBody.type === 'init') {
      const { state, config } = requestBody;
      if (!state || !config || typeof state !== 'object' || typeof config !== 'object') {
        return json({ ok: false, reason: 'bad-request' }, 400);
      }
      if (!isRoomHost(room, nickname)) {
        return json({ ok: false, reason: 'host-only' }, 403);
      }
      if (room.status !== 'playing' || countJoinedPlayers(room) !== room.size) {
        return json({ ok: false, reason: 'room-not-ready' }, 409);
      }
      const snap = await initGame(roomId, { state: state as GameState, config: config as GameConfig });
      return json({ ok: true, snapshot: snap }, 200);
    }
    
    if (requestBody.type === 'move') {
      const { move } = requestBody;
      if (!move || typeof move !== 'object') {
        return json({ ok: false, reason: 'bad-request' }, 400);
      }
      const candidateMove = move as Move;
      if (room.status !== 'playing') {
        return json({ ok: false, reason: 'room-not-playing' }, 409);
      }
      if (candidateMove.player !== actorSeatIndex) {
        return json({ ok: false, reason: 'player-mismatch' }, 403);
      }
      try {
        const snap = await withLock(
          `game:${roomId}`,
          () => applyServerMove(roomId, candidateMove),
          { ttlMs: 5000, retry: 2, retryDelayMs: 100 },
        );
        if (!snap) return json({ ok: false, reason: 'not-found' }, 404);
        return json({ ok: true, snapshot: snap }, 200);
      } catch (lockError) {
        console.error('[friend/game POST] lock error:', lockError);
        return json({ ok: false, reason: 'busy' }, 409);
      }
    }
    
    return json({ ok: false, reason: 'bad-request' }, 400);
  } catch (e) {
    console.error('[friend/game POST] error:', e);
    return json({ ok: false, reason: 'server-error' }, 500);
  }
}


