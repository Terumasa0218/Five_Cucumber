"use client";

export const ALLOW_CHAR_CLASS =
  "[A-Za-z0-9\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Han}]";
export const ALLOW_RE     = new RegExp(`^${ALLOW_CHAR_CLASS}+$`, "u");  // 文字列全体
export const ALLOW_ONE_RE = new RegExp(`${ALLOW_CHAR_CLASS}`, "u");     // 1文字判定

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
  if (!ALLOW_RE.test(v)) {
    const bad = Array.from(v).filter(ch => !ALLOW_ONE_RE.test(ch));
    return { ok: false, reason: "charset", bad };
  }
  return { ok: true, value: v };
}
