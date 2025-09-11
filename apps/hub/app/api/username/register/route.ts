import { getStore } from '@/lib/usernameStore';
import { NextRequest, NextResponse } from 'next/server';

// 許容文字の正規表現（半角英数字、ひらがな、カタカナ、漢字）
const ALLOWED_CHARS = /^[A-Za-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/;

// 簡易NGワード配列
const unsafeWords = ['admin', 'root', 'test', 'guest', 'user', 'null', 'undefined'];

/**
 * グラフェム数を取得（簡易実装）
 */
function getGraphemeCount(text: string): number {
  // 簡易実装：絵文字や結合文字を考慮した文字数カウント
  return Array.from(text).length;
}

/**
 * 不適切な文字のチェック
 */
function containsUnsafeWord(name: string): boolean {
  const lowerName = name.toLowerCase();
  return unsafeWords.some(word => lowerName.includes(word));
}

/**
 * サーバ側バリデーション
 */
function validateNickname(name: string): { valid: boolean; error?: string } {
  // 長さチェック（グラフェム数）
  const graphemeCount = getGraphemeCount(name);
  if (graphemeCount < 1 || graphemeCount > 8) {
    return { valid: false, error: '1〜8文字で入力してください' };
  }
  
  // 文字種チェック
  if (!ALLOWED_CHARS.test(name)) {
    return { valid: false, error: '利用できない文字が含まれています' };
  }
  
  // 不適切語チェック
  if (containsUnsafeWord(name)) {
    return { valid: false, error: '利用できない文字が含まれています' };
  }
  
  return { valid: true };
}

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
    const validation = validateNickname(name);
    if (!validation.valid) {
      return NextResponse.json(
        { ok: false, reason: 'validation_failed', error: validation.error },
        { status: 400 }
      );
    }

    // ストアを取得
    const store = getStore();

    // 重複チェック
    const exists = await store.exists(name);
    if (exists) {
      return NextResponse.json(
        { ok: false, reason: 'duplicate' },
        { status: 409 }
      );
    }

    // 保存
    await store.save(name);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Username registration error:', error);
    return NextResponse.json(
      { ok: false, reason: 'server_error' },
      { status: 500 }
    );
  }
}
