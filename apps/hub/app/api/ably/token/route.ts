export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Ably from 'ably/promises';

export async function GET(req: Request) {
  try {
    const ablyApiKey = process.env.ABLY_API_KEY;
    if (!ablyApiKey) {
      return NextResponse.json(
        { ok: false, reason: 'missing-ABLY_API_KEY' },
        { status: 500 },
      );
    }

    const url = new URL(req.url);
    const roomId = url.searchParams.get('roomId') || '*';

    const ably = new Ably.Rest(ablyApiKey);

    // room-* に subscribe / publish / presence を許可
    const capabilityObj: Record<string, string[]> = {
      'room-*': ['subscribe', 'publish', 'presence'],
    };

    const tokenRequest = await ably.auth.createTokenRequest({
      // clientId はクライアントが明示する場合のみ合わせる
      // clientId: '<client-id-if-needed>',
      capability: JSON.stringify(capabilityObj),
      ttl: 60 * 60 * 1000,
    });

    console.log('[ably/token] capability', capabilityObj, 'roomId', roomId);
    return NextResponse.json(tokenRequest);
  } catch (err) {
    console.error('[ably/token] error', err);
    return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500 });
  }
}


