'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ja" data-theme="light">
      <body>
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
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>重大なエラーが発生しました</h1>
            <p style={{ margin: 0, color: '#555' }}>
              いったんホームに戻るか、再試行してください。
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{ padding: '8px 14px', cursor: 'pointer' }}
              >
                再試行
              </button>
              <Link
                href="/"
                style={{ padding: '8px 14px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                ホームに戻る
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
