import Ably from 'ably/promises';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizeChannel(raw: string) {
  // Ably のチャネル名として無難な範囲に制限（英数/アンダースコア/ハイフン/コロン/スラッシュ/ワイルドカード）
  return (raw || '').replace(/[^-\w:/*]/g, '').slice(0, 128) || 'room-*';
}

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' } as const;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const uid = url.searchParams.get('uid') || 'anon';
  const channel = sanitizeChannel(url.searchParams.get('channel') || 'room-*');

  try {
    const key = process.env.ABLY_API_KEY;
    if (!key) {
      throw new Error('ABLY_API_KEY is not set in environment.');
    }

    // REST クライアント（Node ランタイム前提）
    const rest = new Ably.Rest({ key });

    // このチャンネルで publish / subscribe / presence を許可
    const capability = {
      [channel]: ['publish', 'subscribe', 'presence'],
    } as Record<string, string[]>;

    const tokenRequest = await rest.auth.createTokenRequest({
      clientId: uid,
      capability: JSON.stringify(capability),
      ttl: 60 * 60 * 1000, // 1h
    });

    // デバッグログ（Vercel Runtime Logs に出る）
    console.log('[ABLY_TOKEN][OK]', { uid, channel });

    return NextResponse.json({ ok: true, tokenRequest }, { headers: noStoreHeaders });
  } catch (err: any) {
    // 何が落ちているかを可視化
    console.error('[ABLY_TOKEN][ERROR]', {
      message: err?.message,
      stack: err?.stack,
    });
    return NextResponse.json(
      { ok: false, reason: 'server-error', message: String(err?.message || err) },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

// CORS/プリフライト不要のはずだが、念のため 200 を返す
export async function OPTIONS() {
  return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
}


