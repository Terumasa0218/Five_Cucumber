import Ably from 'ably/promises';
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const uid = url.searchParams.get('uid') ?? 'anon';
  const channel = url.searchParams.get('channel');
  const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

  const capability = channel ? { [channel]: ['subscribe'] } : { '*': ['subscribe'] };
  const tokenRequest = await ably.auth.createTokenRequest({
    clientId: uid,
    capability: JSON.stringify(capability),
    ttl: 60 * 60 * 1000,
  });
  return NextResponse.json(tokenRequest);
}


