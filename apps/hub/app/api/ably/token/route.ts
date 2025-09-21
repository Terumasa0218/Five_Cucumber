export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Ably from 'ably/promises';

export async function GET(req: NextRequest) {
  try {
    const ablyApiKey = process.env.ABLY_API_KEY;
    if (!ablyApiKey) {
      return NextResponse.json({ ok: false, reason: 'missing-ABLY_API_KEY' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const roomId = (searchParams.get('roomId') || '').trim();
    const user = (searchParams.get('user') || '').trim();

    if (!roomId || !user) {
      return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 });
    }

    const capability: Record<string, string[]> = {
      [`room-${roomId}`]: ['publish', 'subscribe', 'presence'],
      [`room-${roomId}-u-*`]: ['publish', 'subscribe'],
    };

    const rest = new Ably.Rest(ablyApiKey);
    const tokenRequest = await rest.auth.createTokenRequest({
      capability: JSON.stringify(capability),
      clientId: `u:${user}`,
      ttl: 60 * 60 * 1000,
    });

    return NextResponse.json(tokenRequest);
  } catch (e) {
    console.error('[ably/token] error', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}


