'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function genCode() {
  // 0埋めで5桁固定
  return String(Math.floor(Math.random() * 100000)).padStart(5, '0');
}

export default function LobbyPage({ params }: { params: { gameId: string } }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'idle'|'create'|'join'>('idle');
  const [code, setCode] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [seats, setSeats] = useState(4);
  const [players, setPlayers] = useState<string[]>([]); // TODO: Firebase接続で埋める
  const full = players.length >= seats;
  const canJoin = /^\d{5}$/.test(code);

  return (
    <main className="min-h-[calc(100svh-64px)] px-6 py-8">
      <h1 className="text-2xl mb-6" style={{color:'var(--ink)'}}>{t('title.lobby')}</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ルーム作成 */}
        <section className="rounded-2xl p-6 bg-[var(--paper)] shadow">
          <h2 className="text-xl mb-2" style={{color:'var(--cuke)'}}>{t('lobby.create.title')}</h2>
          <p className="text-sm mb-4" style={{color:'var(--ink)'}}>{t('lobby.create.desc')}</p>

          <label className="block text-sm mb-2">{t('label.playerCount')}（2–6）</label>
          <input
            type="number" min={2} max={6} value={seats}
            onChange={(e)=>setSeats(Number(e.target.value))}
            className="border rounded px-3 py-2 mb-3 w-32"
          />

          <button
            className="rounded-xl px-4 py-2 shadow"
            style={{background:'var(--brass)', color:'white'}}
            onClick={() => { setCreatedCode(genCode()); setMode('create'); }}
          >
            {t('lobby.create.generate')}
          </button>

          {mode==='create' && createdCode && (
            <div className="mt-4 p-4 rounded-xl border"
                 style={{borderColor:'var(--paper-edge)'}}>
              <div className="text-sm opacity-70 mb-1">{t('lobby.create.code')}</div>
              <div className="text-3xl tracking-widest font-mono">{createdCode}</div>
              <div className="mt-3 flex gap-2">
                <button
                  className="rounded-lg px-3 py-2 border"
                  onClick={async ()=>{ await navigator.clipboard.writeText(createdCode); }}
                >{t('lobby.create.copy')}</button>
                <button
                  className="rounded-lg px-3 py-2 border"
                  // TODO: Firebaseに部屋作成し、待機画面へ遷移
                  onClick={()=>alert('TODO: 部屋作成→待機画面へ')}
                >{t('lobby.create.wait')}</button>
              </div>

              {/* 参加者の枠（UIのみ） */}
              <div className="mt-4">
                <div className="text-sm mb-2 opacity-70">{t('lobby.participants')}（{players.length}/{seats}）</div>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({length:seats}).map((_,i)=>(
                    <div key={i} className="rounded-lg p-3 border h-12 flex items-center"
                         style={{borderColor:'var(--paper-edge)'}}>
                      {players[i] ?? '空席'}
                    </div>
                  ))}
                </div>
                <button
                  className="mt-4 rounded-xl px-4 py-2 shadow disabled:opacity-50"
                  style={{background:'var(--cuke)', color:'white'}}
                  disabled={!full}
                  onClick={()=>alert('TODO: 対戦開始→/play/'+params.gameId)}
                >{t('lobby.start')}</button>
              </div>
            </div>
          )}
        </section>

        {/* ルーム参加 */}
        <section className="rounded-2xl p-6 bg-[var(--paper)] shadow">
          <h2 className="text-xl mb-2" style={{color:'var(--cuke)'}}>{t('lobby.join.title')}</h2>
          <p className="text-sm mb-4" style={{color:'var(--ink)'}}>{t('lobby.join.desc')}</p>

          <input
            inputMode="numeric" pattern="\d{5}"
            placeholder={t('lobby.join.placeholder')}
            value={code}
            onChange={(e)=>setCode(e.target.value.replace(/\D/g,''))}
            className="border rounded px-4 py-3 text-2xl font-mono tracking-widest"
            maxLength={5}
          />
          <div className="mt-3 text-sm" style={{color:'var(--ink)'}}>
            {!canJoin && code.length>0 && <span>{t('validation.code')}</span>}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              className="rounded-xl px-4 py-2 shadow disabled:opacity-50"
              style={{background:'var(--brass)', color:'white'}}
              disabled={!canJoin}
              // TODO: Firebaseで部屋存在チェック→待機画面へ
              onClick={()=>alert(`TODO: ルーム ${code} に参加`)}
            >{t('lobby.join.submit')}</button>
            <Link href="/home" className="rounded-xl px-4 py-2 border">{t('common.back')}</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
