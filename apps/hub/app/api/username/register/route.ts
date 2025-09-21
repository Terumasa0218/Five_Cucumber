export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { kv } from '@vercel/kv';
import crypto from 'node:crypto';

const UID_COOKIE = 'fc_uid';
const MAX_AGE = 60 * 60 * 24 * 365; // 1y

function validNickname(name: string) {
  if (typeof name !== 'string') return false;
  const s = name.trim();
  if (s.length < 1 || s.length > 8) return false;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const nicknameRaw = (body?.nickname ?? body?.name ?? '').toString();
    const nickname = nicknameRaw.trim();

    if (!validNickname(nickname)) {
      return NextResponse.json({ ok: false, reason: 'bad-nickname' }, { status: 400 });
    }

    // 端末 uid（idempotent）
    const jar = cookies();
    let uid = jar.get(UID_COOKIE)?.value;
    if (!uid) {
      uid = crypto.randomUUID();
      jar.set(UID_COOKIE, uid, {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: MAX_AGE,
      });
    }

    const keyUsername = `username:${nickname.toLowerCase()}`;
    const keyOwner = `user:${uid}:username`;

    // NX確保（既に存在なら所有者確認）
    const setRes = await kv.set(keyUsername, uid, { nx: true, ex: MAX_AGE });
    if (setRes === null) {
      const current = await kv.get<string>(keyUsername);
      if (current && current !== uid) {
        return NextResponse.json({ ok: false, reason: 'conflict' }, { status: 409 });
      }
    }

    const id = uid;
    const now = Date.now();
    await kv.set(`user:${id}`, { id, nickname, createdAt: now });
    await kv.set(keyOwner, nickname, { ex: MAX_AGE });

    console.log('[username/register] registered', { id, nickname });
    return NextResponse.json({ ok: true, id, nickname });
  } catch (err) {
    console.error('[username/register] error', err);
    return NextResponse.json({ ok: false, reason: 'server-error' }, { status: 500 });
  }
}