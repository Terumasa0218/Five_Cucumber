"use client";

// スマホ対応の文字判定関数（Unicode対応、正規表現不使用）
function isAllowedChar(char: string): boolean {
  try {
    if (!char || typeof char !== 'string' || char.length === 0) return false;
    
    const code = char.charCodeAt(0);
    
    // 半角英数字
    if (code >= 48 && code <= 57) return true;  // 0-9
    if (code >= 65 && code <= 90) return true;  // A-Z
    if (code >= 97 && code <= 122) return true; // a-z
    
    // ひらがな
    if (code >= 0x3040 && code <= 0x309F) return true;
    
    // カタカナ
    if (code >= 0x30A0 && code <= 0x30FF) return true;
    
    // 漢字
    if (code >= 0x4E00 && code <= 0x9FAF) return true;
    
    return false;
  } catch (error) {
    console.error('isAllowedChar error:', error, 'char:', char);
    return false;
  }
}

// 正規表現は使用せず、文字コード判定のみを使用

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
  
  // 文字コード判定のみを使用（正規表現は一切使用しない）
  const chars = Array.from(v);
  const invalidChars = chars.filter(ch => !isAllowedChar(ch));
  
  if (invalidChars.length > 0) {
    return { ok: false, reason: "charset", bad: invalidChars };
  }
  
  return { ok: true, value: v };
}
