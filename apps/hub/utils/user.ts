'use client';

/**
 * 現在のユーザーのニックネームを取得
 * @returns ニックネーム文字列、または null（未設定の場合）
 */
export function getNickname(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    // 既存のプロフィールキーに合わせて取得
    const stored = localStorage.getItem('five-cucumber-profile');
    if (!stored) return null;
    
    const profile = JSON.parse(stored);
    const nickname = profile?.nickname;
    
    return nickname && typeof nickname === 'string' && nickname.trim().length > 0 
      ? nickname.trim() 
      : null;
  } catch {
    return null;
  }
}

/**
 * ニックネームが設定されているかチェック
 * @returns true: 設定済み, false: 未設定
 */
export function hasNickname(): boolean {
  return getNickname() !== null;
}

