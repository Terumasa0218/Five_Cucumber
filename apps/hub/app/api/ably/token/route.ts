import Ably from 'ably/promises';
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const uid = url.searchParams.get('uid') ?? 'anon';
  const channel = url.searchParams.get('channel');

  // スマホ対応: User-Agentを確認
  const userAgent = req.headers.get('user-agent') || '';
  const isMobile = /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile/.test(userAgent);
  console.log('[Ably] Token request - User:', uid, 'Channel:', channel, 'Mobile:', isMobile, 'UA:', userAgent.substring(0, 100));

  if (!process.env.ABLY_API_KEY) {
    console.error('[Ably] ABLY_API_KEY environment variable is not set');
    return NextResponse.json(
      { error: 'Ably API key not configured' },
      { status: 500 }
    );
  }

  try {
    console.log('[Ably] Creating token for user:', uid, 'channel:', channel);
    const ably = new Ably.Rest(process.env.ABLY_API_KEY);

    const capability = channel ? { [channel]: ['subscribe'] } : { '*': ['subscribe'] };
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: uid,
      capability: JSON.stringify(capability),
      ttl: 60 * 60 * 1000, // 1時間
    });

    console.log('[Ably] Token created successfully for user:', uid, 'length:', JSON.stringify(tokenRequest).length);
    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error('[Ably] Failed to create token:', error);
    return NextResponse.json(
      { error: 'Failed to create Ably token', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


