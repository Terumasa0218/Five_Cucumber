'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
// AuthProvider削除済みのため、ダミーのuseAuth実装
const useAuth = () => ({ user: null as any });
import { useRouter, useSearchParams } from 'next/navigation';

function genCode(){ return String(Math.floor(Math.random()*100000)).padStart(5,'0'); }

export default function LobbyPage({ params }: { params: { gameId:string } }){
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlMode = searchParams.get('mode');

  useEffect(() => {
    if (urlMode === 'friends' && (!user || user.isAnonymous)) {
      const currentUrl = window.location.href;
      router.replace(`/auth/login?next=${encodeURIComponent(currentUrl)}`);
    }
  }, [user, urlMode, router]);

  const [mode,setMode] = useState<'idle'|'create'|'join'>('idle');
  const [seats,setSeats] = useState(4);
  const [code,setCode] = useState('');
  const [created,setCreated] = useState<string|null>(null);
  const canJoin = /^\d{5}$/.test(code);

  return (
    <main className="min-h-[calc(100svh-64px)] px-6 py-8">
      <h1 className="text-2xl mb-6" style={{color:'var(--ink)'}}>オンラインロビー</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {/* ルーム作成 */}
        <section className="rounded-2xl p-6 bg-[var(--paper)] shadow">
          <h2 className="text-xl mb-2" style={{color:'var(--cuke)'}}>ルーム作成</h2>
          <p className="text-sm mb-4" style={{color:'var(--ink)'}}>5桁コードを発行してフレンドを招待</p>
          <label className="block text-sm mb-2">人数（2–6）</label>
          <input type="number" min={2} max={6} value={seats}
            onChange={(e)=>setSeats(Number(e.target.value))}
            className="border rounded px-3 py-2 mb-3 w-32" />
          <button className="rounded-xl px-4 py-2 shadow"
            style={{background:'var(--brass)',color:'#fff'}}
            onClick={()=>{ setCreated(genCode()); setMode('create'); }}>
            5桁コードを発行
          </button>
          {mode==='create' && created && (
            <div className="mt-4 p-4 rounded-xl border" style={{borderColor:'var(--paper-edge)'}}>
              <div className="text-sm opacity-70 mb-1">あなたのルームコード</div>
              <div className="text-3xl tracking-widest font-mono">{created}</div>
              <div className="mt-3 flex gap-2">
                <button className="rounded-lg px-3 py-2 border"
                  onClick={async()=>{ await navigator.clipboard.writeText(created); }}>
                  コピー
                </button>
                <button className="rounded-lg px-3 py-2 border"
                  onClick={()=>alert('TODO: Firebaseに部屋作成→待機画面へ')}>
                  待機へ
                </button>
              </div>
            </div>
          )}
        </section>
        {/* ルーム参加 */}
        <section className="rounded-2xl p-6 bg-[var(--paper)] shadow">
          <h2 className="text-xl mb-2" style={{color:'var(--cuke)'}}>ルーム参加</h2>
          <p className="text-sm mb-4" style={{color:'var(--ink)'}}>受け取った5桁コードを入力</p>
          <input inputMode="numeric" pattern="\d{5}" maxLength={5}
            placeholder="例: 12345" value={code}
            onChange={(e)=>setCode(e.target.value.replace(/\D/g,''))}
            className="border rounded px-4 py-3 text-2xl font-mono tracking-widest" />
          <div className="mt-3 text-sm" style={{color:'var(--ink)'}}>
            {!canJoin && code.length>0 && <span>5桁の数字を入力してください</span>}
          </div>
          <div className="mt-4 flex gap-2">
            <button className="rounded-xl px-4 py-2 shadow disabled:opacity-50"
              style={{background:'var(--brass)',color:'#fff'}} disabled={!canJoin}
              onClick={()=>alert(`TODO: ルーム ${code} に参加`)}>
              参加する
            </button>
            <Link href="/home" className="rounded-xl px-4 py-2 border">戻る</Link>
          </div>
        </section>
      </div>
    </main>
  );
}