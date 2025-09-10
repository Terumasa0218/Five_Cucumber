'use client';

export interface Profile {
  nickname: string;
  avatarId?: string;
}

const PROFILE_KEY = 'five-cucumber-profile';
const GUEST_ID_KEY = 'five-cucumber-guest-id';

// 擬似重複チェック用のローカル配列
const usedNames = new Set<string>();

// 簡易NGワード配列
const unsafeWords = ['admin', 'root', 'test', 'guest', 'user', 'null', 'undefined'];

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
 * ニックネームのバリデーション
 */
export function validateNickname(name: string): { valid: boolean; error?: string } {
  // 長さチェック（グラフェム数）
  const graphemeCount = Array.from(name).length;
  if (graphemeCount < 1 || graphemeCount > 8) {
    return { valid: false, error: 'ニックネームは1-8文字で入力してください' };
  }
  
  // 重複チェック
  if (isDuplicateName(name)) {
    return { valid: false, error: 'すでに使われています' };
  }
  
  // 不適切語チェック
  if (containsUnsafeWord(name)) {
    return { valid: false, error: '利用できない文字が含まれています' };
  }
  
  return { valid: true };
}
