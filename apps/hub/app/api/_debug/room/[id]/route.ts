// TEST-ONLY: check if a room exists in KV. Remove after verification.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const keyOf = (id: string) => `friend:room:${id}`;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = String(params.id);
  try {
    const data = await kv.get(keyOf(id));
    console.log('[debug.room.exists]', { id, exists: !!data });
    return NextResponse.json({ ok: true, exists: !!data });
  } catch (e: any) {
    console.error('[debug.room.exists][error]', e);
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}


