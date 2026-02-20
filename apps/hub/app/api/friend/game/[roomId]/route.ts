import { applyServerMove, getGame, initGame } from '@/lib/friendGameStore';
import { GameConfig, GameState, Move } from '@/lib/game-core';
import { NextRequest, NextResponse } from 'next/server';
import { json } from '@/lib/http';
import { verifyAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type GameInitBody = {
  type: 'init';
  state: GameState;
  config: GameConfig;
};

type GameMoveBody = {
  type: 'move';
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
    const roomId = params.roomId;
    if (!roomId) return json({ ok: false, reason: 'bad-request' }, 400);
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
    const roomId = params.roomId;
    if (!roomId) return json({ ok: false, reason: 'bad-request' }, 400);
    
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
    
    if (requestBody.type === 'init') {
      const { state, config } = requestBody;
      if (!state || !config || typeof state !== 'object' || typeof config !== 'object') {
        return json({ ok: false, reason: 'bad-request' }, 400);
      }
      const snap = await initGame(roomId, { state: state as GameState, config: config as GameConfig });
      return json({ ok: true, snapshot: snap }, 200);
    }
    
    if (requestBody.type === 'move') {
      const { move } = requestBody;
      if (!move || typeof move !== 'object') {
        return json({ ok: false, reason: 'bad-request' }, 400);
      }
      const snap = await applyServerMove(roomId, move as Move);
      if (!snap) return json({ ok: false, reason: 'not-found' }, 404);
      return json({ ok: true, snapshot: snap }, 200);
    }
    
    return json({ ok: false, reason: 'bad-request' }, 400);
  } catch (e) {
    console.error('[friend/game POST] error:', e);
    return json({ ok: false, reason: 'server-error' }, 500);
  }
}


