import { NextRequest, NextResponse } from 'next/server';
import { getGame, initGame, applyServerMove } from '@/lib/friendGameStore';

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
): Promise<NextResponse> {
  const roomId = params.roomId;
  const snap = getGame(roomId);
  if (!snap) return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 });
  return NextResponse.json({ ok: true, snapshot: snap }, { status: 200 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
): Promise<NextResponse> {
  const roomId = params.roomId;
  const body = await req.json();
  const { type } = body || {};
  if (type === 'init') {
    const { state, config } = body || {};
    const snap = initGame(roomId, { state, config });
    return NextResponse.json({ ok: true, snapshot: snap }, { status: 200 });
  }
  if (type === 'move') {
    const { move } = body || {};
    const snap = applyServerMove(roomId, move);
    if (!snap) return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 });
    return NextResponse.json({ ok: true, snapshot: snap }, { status: 200 });
  }
  return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 });
}


