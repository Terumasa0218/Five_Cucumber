import Ably from 'ably/promises';
import { json } from '@/lib/http';
import { verifyAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizeChannel(raw: string): string {
  // Ably のチャネル名として無難な範囲に制限（英数/アンダースコア/ハイフン/コロン/スラッシュ/ワイルドカード）
  return (raw || '').replace(/[^-\w:/*]/g, '').slice(0, 128) || 'room-*';
}

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  try {
    const url = new URL(req.url);
    const uid = url.searchParams.get('uid') ?? 'anon';
    const channel = sanitizeChannel(url.searchParams.get('channel') ?? 'room-*');
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      return json({ ok: false, reason: 'no-ably-key' }, 500);
    }
    const ably = new Ably.Rest(apiKey);
    const token = await ably.auth.createTokenRequest({
      clientId: uid,
      capability: { [channel]: ['publish', 'subscribe', 'presence'] },
    });
    return json({ ok: true, token });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ ok: false, reason: 'server-error', message }, 500);
  }
}

// CORS/プリフライト不要のはずだが、念のため 200 を返す
export async function OPTIONS() {
  return json({ ok: true });
}


