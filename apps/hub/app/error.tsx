'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import {
  isChunkLoadError,
  openCpuPlayClassicView,
  recoverChunkLoadErrorOnce,
} from '@/lib/chunkRecovery';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isRecoverableChunkError = isChunkLoadError(error);
  const canOpenClassicCpuView =
    typeof window !== 'undefined' && window.location.pathname.includes('/cucumber/cpu/play');

  useEffect(() => {
    console.error(error);
    if (isChunkLoadError(error)) {
      recoverChunkLoadErrorOnce('app-error');
    }
  }, [error]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'grid', gap: '12px', maxWidth: '420px' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>予期しないエラーが発生しました</h1>
        <p style={{ margin: 0, color: '#555' }}>
          {isRecoverableChunkError
            ? 'アプリ更新後の古い画面データを読み込んだ可能性があります。再読み込みしても戻らない場合は2D表示で続行できます。'
            : 'お手数ですが、再試行するかホームに戻ってください。'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              if (isRecoverableChunkError) {
                window.location.reload();
                return;
              }
              reset();
            }}
            style={{ padding: '8px 14px', cursor: 'pointer' }}
          >
            {isRecoverableChunkError ? '再読み込み' : '再試行'}
          </button>
          {isRecoverableChunkError && canOpenClassicCpuView ? (
            <button
              type="button"
              onClick={openCpuPlayClassicView}
              style={{ padding: '8px 14px', cursor: 'pointer' }}
            >
              2D表示で続行
            </button>
          ) : null}
          <Link
            href="/"
            style={{ padding: '8px 14px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
