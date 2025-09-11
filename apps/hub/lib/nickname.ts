"use client";

// 文字判定関数（簡素化）
function isAllowedChar(char: string): boolean {
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
}

// 正規表現は使用せず、文字コード判定のみを使用

export function normalizeNickname(raw: string): string {
  if (!raw || typeof raw !== 'string') return "";
  return raw.trim();
}

export function graphemeLength(s: string): number {
  if (!s || typeof s !== 'string') return 0;
  return s.length;
}

export type NicknameValidation =
  | { ok: true; value: string }
  | { ok: false; reason: "length" | "charset"; bad?: string[] };

export function validateNickname(raw: string): NicknameValidation {
  // 超簡素化：trimとlengthのみ
  if (!raw || typeof raw !== 'string') {
    return { ok: false, reason: "length" };
  }
  
  const v = raw.trim();
  if (v.length < 1 || v.length > 8) {
    return { ok: false, reason: "length" };
  }
  
  return { ok: true, value: v };
}
