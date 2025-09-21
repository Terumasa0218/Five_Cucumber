import { applyServerMove, getGame, initGame } from '@/lib/friendGameStore';
import { NextRequest, NextResponse } from 'next/server';
import { json } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
): Promise<NextResponse> {
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
  try {
    const roomId = params.roomId;
    if (!roomId) return json({ ok: false, reason: 'bad-request' }, 400);
    const body = await req.json();
    const { type } = body || {};
    if (type === 'init') {
      const { state, config } = body || {};
      if (!state || !config) return json({ ok: false, reason: 'bad-request' }, 400);
      const snap = await initGame(roomId, { state, config });
      return json({ ok: true, snapshot: snap }, 200);
    }
    if (type === 'move') {
      const { move } = body || {};
      if (!move) return json({ ok: false, reason: 'bad-request' }, 400);
      const snap = await applyServerMove(roomId, move);
      if (!snap) return json({ ok: false, reason: 'not-found' }, 404);
      return json({ ok: true, snapshot: snap }, 200);
    }
    return json({ ok: false, reason: 'bad-request' }, 400);
  } catch (e) {
    console.error('[friend/game POST] error:', e);
    return json({ ok: false, reason: 'server-error' }, 500);
  }
}


