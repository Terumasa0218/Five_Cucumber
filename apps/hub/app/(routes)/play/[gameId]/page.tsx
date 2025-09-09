'use client';
import { useEffect, useRef, useState } from 'react';

export default function PlayPage({ params, searchParams }: any){
  const rootRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 一時的にシンプルな実装
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [params.gameId]);

  return (
    <main className="min-h-[calc(100svh-64px)] p-4">
      {error ? (
        <div className="rounded-xl p-4 border" style={{borderColor:'var(--paper-edge)'}}>
          <div className="text-lg mb-2" style={{color:'var(--ink)'}}>ゲームを読み込めませんでした</div>
          <pre className="text-sm opacity-80">{error}</pre>
        </div>
      ) : (
        <div ref={rootRef} className="w-full h-[80svh] rounded-xl bg-[var(--paper)] shadow grid place-items-center">
          {isLoaded ? (
            <div className="text-center">
              <div className="text-2xl mb-4" style={{color:'var(--cuke)'}}>５本のきゅうり</div>
              <div className="text-lg mb-2" style={{color:'var(--ink)'}}>ゲーム画面</div>
              <div className="text-sm opacity-70 mb-4">ゲームID: {params.gameId}</div>
              <div className="text-sm opacity-70">モード: {searchParams?.mode || 'cpu'}</div>
            </div>
          ) : (
            <span className="opacity-60">読み込み中…</span>
          )}
        </div>
      )}
    </main>
  );
}