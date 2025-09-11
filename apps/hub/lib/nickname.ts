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
  try {
    // 前後空白を除去、NFKCで全角英数→半角などに正規化（漢字はそのまま）
    if (!raw || typeof raw !== 'string') return "";
    return raw.normalize("NFKC").trim();
  } catch (error) {
    console.error('[normalizeNickname] Error:', error);
    // 正規化に失敗した場合は単純にtrimのみ
    return raw?.trim() ?? "";
  }
}

export function graphemeLength(s: string): number {
  try {
    if (!s || typeof s !== 'string') return 0;
    // 簡易実装：絵文字や結合文字を考慮した文字数カウント
    const length = Array.from(s).length;
    console.log('[graphemeLength] Input:', s, 'Length:', length);
    return length;
  } catch (error) {
    console.error('[graphemeLength] Error:', error);
    return 0;
  }
}

export type NicknameValidation =
  | { ok: true; value: string }
  | { ok: false; reason: "length" | "charset"; bad?: string[] };

export function validateNickname(raw: string): NicknameValidation {
  try {
    console.log('[validateNickname] Starting validation with:', raw);
    
    // 最小限のバリデーション
    if (!raw || typeof raw !== 'string') {
      console.log('[validateNickname] Invalid input type');
      return { ok: false, reason: "length" };
    }
    
    // 単純なtrimのみ
    const v = raw.trim();
    console.log('[validateNickname] Trimmed:', v);
    
    // 単純なlengthチェック
    const len = v.length;
    console.log('[validateNickname] Length:', len);
    
    if (len < 1 || len > 8) {
      console.log('[validateNickname] Length validation failed');
      return { ok: false, reason: "length" };
    }
    
    console.log('[validateNickname] Validation successful (simplified)');
    return { ok: true, value: v };
  } catch (error) {
    console.error('[validateNickname] Error:', error);
    return { ok: false, reason: "charset" };
  }
}
