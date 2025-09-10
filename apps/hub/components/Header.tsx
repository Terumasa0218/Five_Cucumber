'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { getFirebaseClient } from '../lib/firebase';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';

/** 背景の"絵がないエリア"に固定配置する左右ナビ */
export default function Header(){
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const fb = getFirebaseClient();
    if (!fb) return;
    return onAuthStateChanged(fb.auth, setUser);
  }, []);

  const top = 'clamp(10px, 5vh, 64px)';           // 上からのオフセット（端末高さで可変）
  const textShadow = '0 1px 0 #ffff, 0 0 6px #0000001f'; // 紙面に馴染む薄い縁取り

  return (
    <>
      {/* 左：ホーム（背景の左余白に置く） */}
      <nav
        className="fixed z-30 left-[max(12px,2vw)] flex items-center gap-6 link-reset"
        style={{ top, textShadow }}
      >
        <Link href="/home" className="hover:opacity-80">ホーム</Link>
        <Link href="/rules/cucumber5" className="hover:opacity-80">ルール</Link>
      </nav>

      {/* 右：ログイン系（背景の右余白に置く） */}
      <nav
        className="fixed z-30 right-[max(12px,2vw)] flex items-center gap-4 md:gap-6 link-reset"
        style={{ top, textShadow }}
      >
        <LanguageSwitcher />
        <ThemeSwitcher />
        {user ? (
          <>
            <Link href="/profile" className="hover:opacity-80">
              {user.displayName ?? 'ユーザー'}
            </Link>
            <button
              onClick={async ()=>{
                const fb = getFirebaseClient();
                if (!fb) return;
                await signOut(fb.auth);
              }}
              className="px-3 py-1.5 rounded-lg border hover:opacity-90"
              style={{borderColor:'var(--paper-edge)'}}
            >
              サインアウト
            </button>
          </>
        ) : (
          <>
            <Link href="/auth/login" className="hover:opacity-80">ゲスト</Link>
            <Link
              href="/auth/login"
              className="px-3 py-1.5 rounded-lg border hover:opacity-90"
              style={{borderColor:'var(--paper-edge)'}}
            >
              ログイン
            </Link>
          </>
        )}
      </nav>
    </>
  );
}