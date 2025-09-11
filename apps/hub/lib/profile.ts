'use client';

export interface Profile {
  nickname: string;
}

const PROFILE_KEY = 'five-cucumber-profile';
const GUEST_ID_KEY = 'five-cucumber-guest-id';
const HAS_PROFILE_KEY = 'hasProfile';

// 擬似重複チェック用のローカル配列
const usedNames = new Set<string>();

// 許容文字の正規表現（半角英数字、ひらがな、カタカナ、漢字）
const ALLOWED_CHARS = /^[A-Za-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/;

// 簡易NGワード配列（一般語は除外）
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
 * プロフィールを保存
 */
export function setProfile(profile: Profile): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    // 重複チェック用配列に追加
    usedNames.add(profile.nickname);
  } catch {
    // エラーは無視
  }
}

/**
 * ゲストIDを取得（Cookieに保存）
 */
export function getGuestId(): string {
  if (typeof document === 'undefined') return '';
  
  // 既存のCookieをチェック
  const existing = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${GUEST_ID_KEY}=`));
  
  if (existing) {
    return existing.split('=')[1];
  }
  
  // 新しいUUIDを生成
  const newId = crypto.randomUUID();
  const maxAge = 180 * 24 * 60 * 60; // 180日
  document.cookie = `${GUEST_ID_KEY}=${newId}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  
  return newId;
}

/**
 * ニックネームの重複チェック
 */
export function isDuplicateName(name: string): boolean {
  return usedNames.has(name);
}

/**
 * 不適切な文字のチェック
 */
export function containsUnsafeWord(name: string): boolean {
  const lowerName = name.toLowerCase();
  return unsafeWords.some(word => lowerName.includes(word));
}

/**
 * hasProfile Cookieを設定/削除
 */
export function setHasProfile(hasProfile: boolean): void {
  if (typeof document === 'undefined') return;
  
  if (hasProfile) {
    const maxAge = 180 * 24 * 60 * 60; // 180日
    document.cookie = `${HAS_PROFILE_KEY}=1; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  } else {
    document.cookie = `${HAS_PROFILE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }
}

/**
 * hasProfile Cookieをチェック
 */
export function hasProfile(): boolean {
  if (typeof document === 'undefined') return false;
  
  return document.cookie
    .split('; ')
    .some(row => row.startsWith(`${HAS_PROFILE_KEY}=1`));
}

/**
 * グラフェム数を取得（簡易実装）
 */
function getGraphemeCount(text: string): number {
  // 簡易実装：絵文字や結合文字を考慮した文字数カウント
  return Array.from(text).length;
}

/**
 * ニックネームのバリデーション（クライアント側）
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
 * デバッグ用: プロフィールとCookieをリセット
 */
export function resetProfile(): void {
  if (typeof window === 'undefined') return;
  
  // localStorage削除
  localStorage.removeItem(PROFILE_KEY);
  
  // Cookie削除
  document.cookie = `${HAS_PROFILE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  document.cookie = `${GUEST_ID_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  
  // 重複チェック配列クリア
  usedNames.clear();
}
