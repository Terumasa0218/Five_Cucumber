'use client';
import { useEffect, useState } from 'react';
import { completeMagicLink, isEmailLink } from '@/lib/auth';
import { useRouter } from 'next/navigation';

// 動的レンダリングを強制
export const dynamic = 'force-dynamic';

export default function AuthComplete() {
  const [msg, setMsg] = useState('確認中…');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        if (!isEmailLink(window.location.href)) {
          setMsg('このURLは無効です。メールのリンクからアクセスしてください。');
          return;
        }
        await completeMagicLink(window.location.href);
        setMsg('サインインが完了しました。ホームに戻ります…');
        setTimeout(()=>router.replace('/home'), 1200);
      } catch (e:any) {
        setMsg(e.message ?? String(e));
      }
    })();
  }, [router]);

  return (
    <main className="min-h-[calc(100svh-64px)] grid place-items-center p-6">
      <div className="rounded-2xl bg-[var(--paper)] shadow p-6">{msg}</div>
    </main>
  );
}
