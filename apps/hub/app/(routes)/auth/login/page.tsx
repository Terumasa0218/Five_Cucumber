'use client';
import { sendMagicLink } from '@/lib/auth';
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

  return (
    <main className="min-h-[calc(100svh-64px)] grid place-items-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左：ログイン */}
        <section className="rounded-2xl bg-[var(--paper)] shadow p-6">
          <h2 className="text-xl mb-3" style={{color:'var(--cuke)'}}>ログイン</h2>
          {sentTo ? (
            <CompleteCard email={sentTo} />
          ) : (
            <form onSubmit={submit('login')} className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-sm">メールアドレス</span>
                <input type="email" required value={emailLogin} onChange={e=>setEmailLogin(e.target.value)}
                  className="border rounded px-3 py-2" placeholder="you@example.com" />
              </label>
              {err && <p className="text-sm" style={{color:'#b00020'}}>{err}</p>}
              <button className="rounded-xl px-4 py-2 shadow" style={{background:'var(--brass)',color:'#fff'}}>リンクを送信</button>
              <p className="text-xs opacity-70">受信メールのリンクをこの端末で開いてください。</p>
            </form>
          )}
        </section>

        {/* 右：新規作成 */}
        <section className="rounded-2xl bg-[var(--paper)] shadow p-6">
          <h2 className="text-xl mb-3" style={{color:'var(--cuke)'}}>新規作成</h2>
          {sentTo ? (
            <CompleteCard email={sentTo} />
          ) : (
            <form onSubmit={submit('signup')} className="grid gap-3">
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
              <button className="rounded-xl px-4 py-2 shadow" style={{background:'var(--brass)',color:'#fff'}}>リンクを送信</button>
              <p className="text-xs opacity-70">受信メールのリンクをこの端末で開いてください。</p>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function CompleteCard({email}:{email:string}) {
  return (
    <div className="rounded-xl border p-4" style={{borderColor:'var(--paper-edge)'}}>
      <p className="mb-2">宛先：<b>{email}</b></p>
      <p>メールのリンクを開くと手続きが完了します。</p>
      <div className="mt-4"><Link className="underline" href="/home">ホームへ戻る</Link></div>
    </div>
  );
}
