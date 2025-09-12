"use client";

export const ALLOW_CHAR_CLASS =
  "[A-Za-z0-9\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Han}]";
export const ALLOW_RE     = new RegExp(`^${ALLOW_CHAR_CLASS}+$`, "u");
export const ALLOW_ONE_RE = new RegExp(`${ALLOW_CHAR_CLASS}`, "u");

export function normalizeNickname(raw: string): string {
  return (raw ?? "").normalize("NFKC").trim();
}

export function graphemeLength(s: string): number {
  // Node.js互換の簡易実装
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
