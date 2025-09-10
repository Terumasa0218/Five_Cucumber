'use client';
import { sendMagicLink } from '@/lib/auth';
import { setGuestSession, getRedirectUrl } from '@/app/lib/session';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState, useEffect, Suspense } from 'react';

// 動的レンダリングを強制
export const dynamic = 'force-dynamic';

function AuthLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/home';
  
  const [mode, setMode] = useState<'select' | 'login' | 'signup'>('select');
  const [emailLogin, setEmailLogin] = useState('');
  const [emailSignup, setEmailSignup] = useState('');
  const [nameSignup, setNameSignup] = useState('');
  const [sentTo, setSentTo] = useState<string|null>(null);
  const [err, setErr] = useState<string|null>(null);

  const submit = (mode:'login'|'signup') => async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      if (mode === 'login') {
        await sendMagicLink(emailLogin.trim());
        setSentTo(emailLogin.trim());
      } else {
        await sendMagicLink(emailSignup.trim(), nameSignup.trim());
        setSentTo(emailSignup.trim());
      }
    } catch (e:any) { setErr(e.message ?? String(e)); }
  };

  const handleAnonLogin = async () => {
    try {
      const { getFirebaseClient } = require('../../../lib/firebase');
      const { signInAnonymously } = require('firebase/auth');
      const fb = getFirebaseClient();
      if (fb) {
        await signInAnonymously(fb.auth);
      }
    } catch (e) {
      // Firebase未設定の場合は無視
    }
    // fc_session cookieを設定
    if (typeof document !== 'undefined') {
      document.cookie = 'fc_session=user; Max-Age=2592000; Path=/; SameSite=Lax';
    }
    router.replace(nextUrl);
  };

  const handleGuestLogin = () => {
    // fc_session cookieを設定
    if (typeof document !== 'undefined') {
      document.cookie = 'fc_session=guest; Max-Age=2592000; Path=/; SameSite=Lax';
    }
    router.replace(nextUrl);
  };

  if (mode === 'select') {
    return (
      <main className="bg-home min-h-[100svh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md mx-auto">
          <div className="rounded-2xl border border-[color:var(--paper-edge)] bg-[color:var(--paper)]/92 p-8 shadow">
            <h1 className="text-2xl text-center mb-8" style={{color:'var(--cuke)'}}>ログイン</h1>
            
            <div className="space-y-4">
              <button
                onClick={handleAnonLogin}
                className="w-full rounded-xl px-6 py-3 shadow transition-colors"
                style={{background:'var(--brass)',color:'#fff'}}
              >
                ログイン
              </button>
              
              <button
                onClick={() => setMode('signup')}
                className="w-full rounded-xl px-6 py-3 border transition-colors"
                style={{borderColor:'var(--paper-edge)',color:'var(--ink)'}}
              >
                アカウント新規作成
              </button>
              
              <button
                onClick={handleGuestLogin}
                className="w-full rounded-xl px-6 py-3 border transition-colors"
                style={{borderColor:'var(--paper-edge)',color:'var(--ink)'}}
              >
                ゲストとして利用
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (sentTo) {
    return (
      <main className="bg-home min-h-[100svh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md mx-auto">
          <CompleteCard email={sentTo} onBack={() => setMode('select')} />
        </div>
      </main>
    );
  }

  return (
    <main className="bg-home min-h-[100svh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md mx-auto">
        <div className="rounded-2xl border border-[color:var(--paper-edge)] bg-[color:var(--paper)]/92 p-8 shadow">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setMode('select')}
              className="text-lg hover:opacity-70"
              style={{color:'var(--ink)'}}
            >
              ←
            </button>
            <h2 className="text-xl" style={{color:'var(--cuke)'}}>
              {mode === 'login' ? 'ログイン' : 'アカウント新規作成'}
            </h2>
          </div>
          
          {mode === 'login' ? (
            <form onSubmit={submit('login')} className="grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm" style={{color:'var(--ink)'}}>メールアドレス</span>
                <input 
                  type="email" 
                  required 
                  value={emailLogin} 
                  onChange={e=>setEmailLogin(e.target.value)}
                  className="border rounded px-3 py-2" 
                  placeholder="you@example.com" 
                />
              </label>
              {err && <p className="text-sm" style={{color:'#b00020'}}>{err}</p>}
              <button 
                className="rounded-xl px-4 py-2 shadow mt-1" 
                style={{background:'var(--brass)',color:'#fff'}}
              >
                リンクを送信
              </button>
              <p className="text-xs opacity-70" style={{color:'var(--ink)'}}>
                受信メールのリンクをこの端末で開いてください。
              </p>
            </form>
          ) : (
            <form onSubmit={submit('signup')} className="grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm" style={{color:'var(--ink)'}}>ユーザー名</span>
                <input 
                  required 
                  value={nameSignup} 
                  onChange={e=>setNameSignup(e.target.value)}
                  className="border rounded px-3 py-2" 
                  placeholder="例: matsuoka" 
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm" style={{color:'var(--ink)'}}>メールアドレス</span>
                <input 
                  type="email" 
                  required 
                  value={emailSignup} 
                  onChange={e=>setEmailSignup(e.target.value)}
                  className="border rounded px-3 py-2" 
                  placeholder="you@example.com" 
                />
              </label>
              {err && <p className="text-sm" style={{color:'#b00020'}}>{err}</p>}
              <button 
                className="rounded-xl px-4 py-2 shadow mt-1" 
                style={{background:'var(--brass)',color:'#fff'}}
              >
                リンクを送信
              </button>
              <p className="text-xs opacity-70" style={{color:'var(--ink)'}}>
                受信メールのリンクをこの端末で開いてください。
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function CompleteCard({email, onBack}:{email:string, onBack?: () => void}) {
  return (
    <div className="rounded-xl border p-6 space-y-2" style={{borderColor:'var(--paper-edge)'}}>
      <p style={{color:'var(--ink)'}}>宛先：<code>{email}</code></p>
      <p style={{color:'var(--ink)'}}>メールのリンクを開くと手続きが完了します。</p>
      <div className="pt-2">
        {onBack ? (
          <button onClick={onBack} className="underline" style={{color:'var(--ink)'}}>
            戻る
          </button>
        ) : (
          <Link className="underline" href="/home" style={{color:'var(--ink)'}}>
            ホームへ戻る
          </Link>
        )}
      </div>
    </div>
  );
}

export default function AuthLogin() {
  return (
    <Suspense fallback={
      <main className="bg-home min-h-[100svh] flex items-center justify-center px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </main>
    }>
      <AuthLoginContent />
    </Suspense>
  );
}
