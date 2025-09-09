'use client';
import { sendMagicLink } from '@/lib/auth';
import { useAuth } from '@/providers/AuthProvider';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

// 動的レンダリングを強制
export const dynamic = 'force-dynamic';

export default function AuthLogin() {
  const [emailLogin, setEmailLogin] = useState('');
  const [emailSignup, setEmailSignup] = useState('');
  const [nameSignup, setNameSignup] = useState('');
  const [sentTo, setSentTo] = useState<string|null>(null);
  const [err, setErr] = useState<string|null>(null);
  const { signinGuest } = useAuth();

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

  const handleGuestLogin = async () => {
    await signinGuest();
    window.location.href = '/home';
  };

  return (
    <main className="min-h-[calc(100svh-64px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* 左：ログイン */}
        <section className="rounded-2xl bg-[var(--paper)] shadow p-8 flex flex-col">
          <h2 className="text-xl mb-3" style={{color:'var(--cuke)'}}>ログイン</h2>
          {sentTo ? (
            <CompleteCard email={sentTo} />
          ) : (
            <form onSubmit={submit('login')} className="grid gap-3 mt-2">
              <label className="grid gap-1">
                <span className="text-sm">メールアドレス</span>
                <input type="email" required value={emailLogin} onChange={e=>setEmailLogin(e.target.value)}
                  className="border rounded px-3 py-2" placeholder="you@example.com" />
              </label>
              {err && <p className="text-sm" style={{color:'#b00020'}}>{err}</p>}
              <button className="rounded-xl px-4 py-2 shadow mt-1" style={{background:'var(--brass)',color:'#fff'}}>リンクを送信</button>
              <p className="text-xs opacity-70">受信メールのリンクをこの端末で開いてください。</p>
            </form>
          )}
        </section>

        {/* 右：新規作成 */}
        <section className="rounded-2xl bg-[var(--paper)] shadow p-8 flex flex-col">
          <h2 className="text-xl mb-3" style={{color:'var(--cuke)'}}>新規作成</h2>
          {sentTo ? (
            <CompleteCard email={sentTo} />
          ) : (
            <form onSubmit={submit('signup')} className="grid gap-3 mt-2">
              <label className="grid gap-1">
                <span className="text-sm">ユーザー名</span>
                <input required value={nameSignup} onChange={e=>setNameSignup(e.target.value)}
                  className="border rounded px-3 py-2" placeholder="例: matsuoka" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">メールアドレス</span>
                <input type="email" required value={emailSignup} onChange={e=>setEmailSignup(e.target.value)}
                  className="border rounded px-3 py-2" placeholder="you@example.com" />
              </label>
              {err && <p className="text-sm" style={{color:'#b00020'}}>{err}</p>}
              <button className="rounded-xl px-4 py-2 shadow mt-1" style={{background:'var(--brass)',color:'#fff'}}>リンクを送信</button>
              <p className="text-xs opacity-70">受信メールのリンクをこの端末で開いてください。</p>
            </form>
          )}
        </section>
      </div>
      
      <div className="mt-8 text-center">
        <button
          onClick={handleGuestLogin}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          ゲストとして利用
        </button>
      </div>
    </main>
  );
}

function CompleteCard({email}:{email:string}) {
  return (
    <div className="rounded-xl border p-6 space-y-2" style={{borderColor:'var(--paper-edge)'}}>
      <p>宛先：<code>{email}</code></p>
      <p>メールのリンクを開くと手続きが完了します。</p>
      <div className="pt-2"><Link className="underline" href="/home">ホームへ戻る</Link></div>
    </div>
  );
}
