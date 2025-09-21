import { NextRequest, NextResponse } from 'next/server'
import Ably from 'ably'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function json(data: any, init?: number | ResponseInit) {
  const initObj: ResponseInit = typeof init === 'number' ? { status: init } : (init ?? {})
  return NextResponse.json(data, {
    headers: { 'cache-control': 'no-store' },
    ...initObj,
  })
}

export async function GET(req: NextRequest) {
  try {
    if (!process.env.ABLY_API_KEY) {
      console.error('[ably/token] missing ABLY_API_KEY')
      return json({ ok: false, reason: 'missing-ably-key' }, 500)
    }

    const url = new URL(req.url)
    const uid = url.searchParams.get('uid')?.trim()
    const channel = url.searchParams.get('channel')?.trim()

    if (!uid || !channel) {
      console.warn('[ably/token] missing params', { uid: !!uid, channel: !!channel })
      return json({ ok: false, reason: 'missing-params' }, 400)
    }

    // チャンネル名は room-<6桁> のみ許可
    if (!/^room-\d{6}$/.test(channel)) {
      console.warn('[ably/token] invalid channel', channel)
      return json({ ok: false, reason: 'invalid-channel' }, 400)
    }

    if (uid.length > 32) {
      return json({ ok: false, reason: 'invalid-uid' }, 400)
    }

    const rest = new (Ably as any).Rest(process.env.ABLY_API_KEY)

    const capability = { [channel]: ['publish', 'subscribe', 'presence', 'history'] }

    const tokenRequest = await rest.auth.createTokenRequest({
      clientId: uid,
      capability: JSON.stringify(capability),
      ttl: 60 * 60 * 1000,
    })

    return json(tokenRequest, 200)
  } catch (err: any) {
    console.error('[ably/token] error', err)
    return json({ ok: false, reason: 'server-error', message: err?.message }, 500)
  }
}

export const POST = GET


