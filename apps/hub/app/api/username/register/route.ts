import { validateNickname } from '@/lib/nickname';
import { getStore } from '@/lib/usernameStore';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { ok: false, reason: 'invalid_input' },
        { status: 400 }
      );
    }

    // サーバ側バリデーション
    const r = validateNickname(name);
    if (!r.ok) {
      return NextResponse.json(
        { ok: false, reason: r.reason },
        { status: 400 }
      );
    }

    // ストアを取得
    const store = getStore();

    // 重複チェック
    const exists = await store.exists(r.value);
    if (exists) {
      return NextResponse.json(
        { ok: false, reason: 'duplicate' },
        { status: 409 }
      );
    }

    // 保存
    await store.save(r.value);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Username registration error:', error);
    return NextResponse.json(
      { ok: false, reason: 'server_error' },
      { status: 500 }
    );
  }
}
