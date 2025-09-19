import { applyServerMove, getGame, initGame } from '@/lib/friendGameStore';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
): Promise<NextResponse> {
  try {
    const roomId = params.roomId;
    if (!roomId) return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 });
    const snap = getGame(roomId);
    if (!snap) return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 });
    return NextResponse.json({ ok: true, snapshot: snap }, { status: 200 });
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
    if (!roomId) return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 });
    const body = await req.json();
    const { type } = body || {};
    if (type === 'init') {
      const { state, config } = body || {};
      if (!state || !config) return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 });
      const snap = initGame(roomId, { state, config });
      return NextResponse.json({ ok: true, snapshot: snap }, { status: 200 });
    }
    if (type === 'move') {
      const { move } = body || {};
      if (!move) return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 });
      const snap = applyServerMove(roomId, move);
      if (!snap) return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 });
      return NextResponse.json({ ok: true, snapshot: snap }, { status: 200 });
    }
    return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 });
  } catch (e) {
    console.error('[friend/game POST] error:', e);
    return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500 });
  }
}


