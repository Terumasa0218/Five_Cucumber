'use client';

export interface Profile {
  nickname: string;
}

const PROFILE_KEY = 'five-cucumber-profile';

// 許容文字の正規表現（半角英数字、ひらがな、カタカナ、漢字）
const ALLOWED_CHARS = /^[A-Za-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/;

// 簡易NGワード配列
const unsafeWords = ['admin', 'root', 'guest', 'user', 'null', 'undefined'];

/**
 * プロフィールを取得
 */
export function getProfile(): Profile | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * 現在のユーザーのニックネームを取得
 * @returns ニックネーム文字列、または null（未設定の場合）
 */
export function getNickname(): string | null {
  const profile = getProfile();
  const nickname = profile?.nickname;
  
  return nickname && typeof nickname === 'string' && nickname.trim().length > 0 
    ? nickname.trim() 
    : null;
}

/**
 * プロフィールを保存
 */
export function setProfile(profile: Profile): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // エラーは無視
  }
}

/**
 * 不適切語チェック
 */
function containsUnsafeWord(text: string): boolean {
  const lowerText = text.toLowerCase();
  return unsafeWords.some(word => lowerText.includes(word));
}

/**
 * グラフェムクラスターの数を取得（絵文字対応）
 */
function getGraphemeCount(text: string): number {
  // Intl.Segmenterが利用可能な場合は使用
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    type SegmenterConstructor = new (locales?: string | string[], options?: { granularity?: 'grapheme' | 'word' | 'sentence' }) => {
      segment(input: string): Iterable<{ segment: string; index: number; input: string }>;
    };
    const SegmenterCtor = (Intl as typeof Intl & { Segmenter?: SegmenterConstructor }).Segmenter;
    if (typeof SegmenterCtor === 'function') {
      const segmenter = new SegmenterCtor();
      return Array.from(segmenter.segment(text)).length;
    }
  }
  
  // フォールバック: 単純な文字数カウント
  return text.length;
}

/**
 * ニックネームのバリデーション
 * @deprecated 新しい共通ロジック @/lib/nickname を使用してください
 */
export function validateNickname(name: string): { valid: boolean; error?: string } {
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

/**
 * デバッグ用: プロフィールをリセット
 */
export function resetProfile(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(PROFILE_KEY);
}