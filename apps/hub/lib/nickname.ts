"use client";

// スマホ対応の文字判定関数
function isAllowedChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    // 半角英数字
    (code >= 48 && code <= 57) ||  // 0-9
    (code >= 65 && code <= 90) ||  // A-Z
    (code >= 97 && code <= 122) || // a-z
    // ひらがな
    (code >= 0x3040 && code <= 0x309F) ||
    // カタカナ
    (code >= 0x30A0 && code <= 0x30FF) ||
    // 漢字
    (code >= 0x4E00 && code <= 0x9FAF)
  );
}

export const ALLOW_RE = /^[A-Za-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/;  // 文字列全体
export const ALLOW_ONE_RE = /[A-Za-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;  // 1文字判定

export function normalizeNickname(raw: string): string {
  // 前後空白を除去、NFKCで全角英数→半角などに正規化（漢字はそのまま）
  return raw?.normalize("NFKC").trim() ?? "";
}

export function graphemeLength(s: string): number {
  // 簡易実装：絵文字や結合文字を考慮した文字数カウント
  return Array.from(s).length;
}

export type NicknameValidation =
  | { ok: true; value: string }
  | { ok: false; reason: "length" | "charset"; bad?: string[] };

export function validateNickname(raw: string): NicknameValidation {
  const v = normalizeNickname(raw);
  const len = graphemeLength(v);
  
  if (len < 1 || len > 8) return { ok: false, reason: "length" };
  
  // スマホ対応：正規表現と文字コード判定の両方を使用
  const regexTest = ALLOW_RE.test(v);
  const charCodeTest = Array.from(v).every(ch => isAllowedChar(ch));
  
  if (!regexTest || !charCodeTest) {
    const bad = Array.from(v).filter(ch => !isAllowedChar(ch));
    return { ok: false, reason: "charset", bad };
  }
  return { ok: true, value: v };
}
