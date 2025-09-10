'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { getFirebaseClient } from '../lib/firebase';
import { getSessionMode } from '../app/lib/session';

/** 最小限のヘッダー（固定・最小限） */
export default function Header(){
  // 🔒 認証画面ではヘッダーを出さない
  const pathname = usePathname();
  if (pathname?.startsWith('/auth')) {
    return null;
  }
  
  const [user, setUser] = useState<User | null>(null);
  const [sessionMode, setSessionMode] = useState<'user' | 'guest' | null>(null);
  
  useEffect(() => {
    const fb = getFirebaseClient();
    if (!fb) return;
    return onAuthStateChanged(fb.auth, setUser);
  }, []);
  
  useEffect(() => {
    setSessionMode(getSessionMode());
  }, [user]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="safe-zone flex items-center justify-between py-4">
        {/* 左：タイトル */}
        <Link href="/home" className="font-heading text-xl text-[var(--antique-ink)] hover:opacity-80">
          5本のきゅうり
        </Link>

        {/* 右：ナビゲーション */}
        <nav className="flex items-center gap-6">
          <Link href="/rules/cucumber5" className="font-body text-[var(--antique-ink)] hover:text-[var(--antique-forest)] transition-colors">
            ルール
          </Link>
          
          {sessionMode === 'user' && user ? (
            <>
              <span className="font-body text-[var(--antique-muted)]">
                {user.displayName ?? 'ユーザー'}
              </span>
              <button
                onClick={async ()=>{
                  const fb = getFirebaseClient();
                  if (fb) {
                    await signOut(fb.auth);
                  }
                  // fc_session を削除
                  if (typeof document !== 'undefined') {
                    document.cookie = 'fc_session=; Max-Age=0; Path=/; SameSite=Lax';
                  }
                  window.location.reload();
                }}
                className="btn-link"
              >
                ログアウト
              </button>
            </>
          ) : (
            <Link href="/auth/login" className="btn-link">
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}