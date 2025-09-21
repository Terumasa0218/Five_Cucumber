import Ably from 'ably/promises';
import { NextResponse } from 'next/server';
import { json } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizeChannel(raw: string) {
  // Ably のチャネル名として無難な範囲に制限（英数/アンダースコア/ハイフン/コロン/スラッシュ/ワイルドカード）
  return (raw || '').replace(/[^-\w:/*]/g, '').slice(0, 128) || 'room-*';
}

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' } as const;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const uid = url.searchParams.get('uid') ?? 'anon';
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      return json({ ok: false, reason: 'no-ably-key' }, 500);
    }
    const ably = new Ably.Rest(apiKey);
    const token = await ably.auth.createTokenRequest({ clientId: uid });
    return json({ ok: true, token });
  } catch (e: any) {
    return json({ ok: false, reason: 'server-error', message: String(e?.message ?? e) }, 500);
  }
}

// CORS/プリフライト不要のはずだが、念のため 200 を返す
export async function OPTIONS() {
  return json({ ok: true });
}


