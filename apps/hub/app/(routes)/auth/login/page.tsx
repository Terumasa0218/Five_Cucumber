'use client';
import { FormEvent, useState } from 'react';
import { sendMagicLink } from '@/lib/auth';
import Link from 'next/link';

export default function AuthLogin() {
  const [tab, setTab] = useState<'login'|'signup'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState(''); // signup用
  const [sent, setSent] = useState<string|null>(null);
  const [err, setErr] = useState<string|null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await sendMagicLink(email.trim(), tab==='signup' ? name.trim() : undefined);
      setSent(email.trim());
    } catch (e:any) {
      setErr(e.message ?? String(e));
    }
  };

  return (
    <main className="min-h-[calc(100svh-64px)] grid place-items-center p-6">
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-[200px,1fr] gap-6">
        {/* 縦タブ */}
        <nav className="rounded-2xl bg-[var(--paper)] shadow p-2 h-fit">
          <button onClick={()=>setTab('login')}
            className={`block w-full text-left px-4 py-3 rounded-lg ${tab==='login'?'bg-[var(--paper-edge)]':''}`}>ログイン</button>
          <button onClick={()=>setTab('signup')}
            className={`block w-full text-left px-4 py-3 rounded-lg mt-2 ${tab==='signup'?'bg-[var(--paper-edge)]':''}`}>新規作成</button>
        </nav>

        {/* パネル */}
        <section className="rounded-2xl bg-[var(--paper)] shadow p-6">
          <h1 className="text-xl mb-4" style={{color:'var(--ink)'}}>
            {tab==='login' ? 'メールでログイン' : 'アカウントを作成'}
          </h1>

          {sent ? (
            <div className="rounded-xl border p-4" style={{borderColor:'var(--paper-edge)'}}>
              <p className="mb-2">宛先：<b>{sent}</b></p>
              <p>受信メールのリンクを開くと完了します。</p>
              <div className="mt-4"><Link className="underline" href="/home">ホームへ戻る</Link></div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-3">
              {tab==='signup' && (
                <label className="grid gap-1">
                  <span className="text-sm">ユーザー名</span>
                  <input value={name} onChange={e=>setName(e.target.value)} required
                    className="border rounded px-3 py-2" placeholder="例: matsuoka" />
                </label>
              )}
              <label className="grid gap-1">
                <span className="text-sm">メールアドレス</span>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                  className="border rounded px-3 py-2" placeholder="you@example.com" />
              </label>
              {err && <p className="text-sm" style={{color:'#b00020'}}>{err}</p>}
              <button className="mt-2 rounded-xl px-4 py-2 shadow"
                style={{background:'var(--brass)', color:'#fff'}}>
                リンクを送信
              </button>
              <p className="text-xs opacity-70 mt-2">
                迷惑メールに入る場合があります。リンクはこの端末で開いてください。
              </p>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
