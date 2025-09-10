/* ログイン画面：半透明カードで視線を集中 */
'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
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
    <main className="min-h-[100svh] w-full flex items-center justify-center">
      <div className="safe-zone">
        <div className="max-w-md mx-auto">
          <div className="card">
            <h1 className="font-heading text-3xl text-center text-[var(--antique-ink)] mb-8">
              ログイン
            </h1>
            
            <div className="space-y-4">
              {/* Primary: ゲストで今すぐ遊ぶ */}
              <button
                onClick={handleGuest}
                className="btn-primary w-full"
              >
                ゲストで今すぐ遊ぶ
              </button>
              
              {/* Secondary: ログイン */}
              <button
                onClick={handleLogin}
                className="btn-secondary w-full"
              >
                ログイン
              </button>
              
              {/* Link: アカウント新規作成 */}
              <Link
                href="/auth/signup"
                className="btn-link w-full text-center block"
              >
                アカウント新規作成
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-[100svh] w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--antique-forest)] mx-auto mb-4"></div>
          <p className="font-body text-[var(--antique-muted)]">読み込み中...</p>
        </div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}