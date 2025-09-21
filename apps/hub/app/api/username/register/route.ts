export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { kv } from '@vercel/kv';
import crypto from 'node:crypto';

function validNickname(name: string) {
  if (typeof name !== 'string') return false;
  const s = name.trim();
  if (s.length < 1 || s.length > 8) return false;
  return true;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const nicknameRaw = (body?.nickname ?? body?.name ?? '').toString();
    const nickname = nicknameRaw.trim();

    if (!validNickname(nickname)) {
      return NextResponse.json({ ok: false, reason: 'bad-nickname' }, { status: 400 });
    }

    // 重複チェック
    const takenId = await kv.get<string>(`name:${nickname}`);
    if (takenId) {
      return NextResponse.json({ ok: false, reason: 'name-taken' }, { status: 409 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    await kv.set(`user:${id}`, { id, nickname, createdAt: now });
    await kv.set(`name:${nickname}`, id);

    const store = cookies();
    store.set('fc_uid', id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
    });

    console.log('[username/register] registered', { id, nickname });
    return NextResponse.json({ ok: true, id, nickname });
  } catch (err) {
    console.error('[username/register] error', err);
    return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500 });
  }
}