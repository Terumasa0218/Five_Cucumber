'use client';

export type SessionMode = 'user' | 'guest' | null;

const SESSION_KEY = 'five-cucumber-session';
const GUEST_KEY = 'five-cucumber-guest';

/**
 * 現在のセッションモードを取得
 * - 'user': Firebase認証済みユーザー
 * - 'guest': ゲストセッション
 * - null: 未セッション
 */
export function getSessionMode(): SessionMode {
  if (typeof window === 'undefined') return null;
  
  // Firebase認証済みユーザーかチェック
  try {
    const { getFirebaseClient } = require('../../lib/firebase');
    const fb = getFirebaseClient();
    if (fb?.auth?.currentUser) {
      return 'user';
    }
  } catch (e) {
    // Firebase未設定の場合は無視
  }
  
  // ゲストセッションかチェック
  const guestSession = localStorage.getItem(GUEST_KEY);
  if (guestSession === 'true') {
    return 'guest';
  }
  
  return null;
}

/**
 * ゲストセッションを開始
 */
export function setGuestSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_KEY, 'true');
}

/**
 * セッションをクリア（ログアウト時）
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_KEY);
  localStorage.removeItem(SESSION_KEY);
  
  // Firebase認証もクリア
  try {
    const { getFirebaseClient } = require('../../lib/firebase');
    const fb = getFirebaseClient();
    if (fb?.auth) {
      fb.auth.signOut();
    }
  } catch (e) {
    // Firebase未設定の場合は無視
  }
}

/**
 * ユーザーセッションを設定（Firebase認証成功時）
 */
export function setUserSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_KEY);
  localStorage.setItem(SESSION_KEY, 'user');
}

/**
 * ログインが必要なページかチェック
 */
export function requiresLogin(pathname: string): boolean {
  // 認証関連ページは除外
  if (pathname.startsWith('/auth/')) return false;
  
  // フレンド対戦は要ログイン
  if (pathname.includes('/lobby/') && pathname.includes('mode=friends')) {
    return true;
  }
  
  return false;
}

/**
 * リダイレクト先URLを生成
 */
export function getRedirectUrl(pathname: string, search?: string): string {
  const currentUrl = pathname + (search || '');
  return `/auth/login?next=${encodeURIComponent(currentUrl)}`;
}
