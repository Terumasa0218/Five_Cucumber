/* ログイン画面：言語切替のみ表示、CTAは縦並び、ゲストはcookie設定して遷移 */
'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import LanguageSwitcher from '../../../../components/LanguageSwitcher';
import { getFirebaseClient } from '../../../../lib/firebase';
import { signInAnonymously } from 'firebase/auth';

function setCookie(k: string, v: string, days = 30) {
  if (typeof document === 'undefined') return;
  const max = days * 24 * 60 * 60;
  document.cookie = `${k}=${v}; Max-Age=${max}; Path=/; SameSite=Lax`;
}

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/home';

  const go = () => {
    try { router.replace(next); }
    catch { window.location.assign(next); }
  };

  const handleGuest = () => {
    setCookie('fc_session','guest');
    go();
  };

  const handleLogin = async () => {
    // ひとまず匿名ログイン（環境が未設定でもゲスト相当で継続）
    const fb = getFirebaseClient();
    if (fb) {
      try { await signInAnonymously(fb.auth); } catch {}
      setCookie('fc_session','user');
    } else {
      // Firebaseが無くてもUI遷移は可能
      setCookie('fc_session','user');
    }
    go();
  };

  return (
    <main className="bg-home min-h-[100svh]">
      {/* 左上：言語切替のみ */}
      <div className="fixed left-3 top-3 z-50">
        <LanguageSwitcher />
      </div>

      {/* 中央カード */}
      <div className="mx-auto flex min-h-[100svh] max-w-md items-center justify-center px-4">
        <div
          className="w-full rounded-2xl border p-6 shadow-lg"
          style={{ backgroundColor: 'color-mix(in srgb, var(--paper) 92%, transparent)',
                   borderColor: 'var(--paper-edge)'}}
        >
          <h1 className="mb-4 text-center text-3xl font-semibold" style={{color:'var(--cuke)'}}>ログイン</h1>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleLogin}
              className="w-full rounded-lg border px-4 py-2 hover:opacity-90"
              style={{borderColor:'var(--paper-edge)'}}
            >
              ログイン
            </button>
            <a
              href="/auth/signup"
              className="w-full rounded-lg border px-4 py-2 text-center hover:opacity-90"
              style={{borderColor:'var(--paper-edge)'}}
            >
              アカウント新規作成
            </a>
            <button
              onClick={handleGuest}
              className="w-full rounded-lg border px-4 py-2 hover:opacity-90"
              style={{borderColor:'var(--paper-edge)'}}
            >
              ゲストとして利用
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="bg-home min-h-[100svh] flex items-center justify-center px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}