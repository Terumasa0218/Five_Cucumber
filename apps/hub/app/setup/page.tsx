'use client';

import { resetProfile, setHasProfile, setProfile } from '@/lib/profile';
import { validateNickname } from '@/lib/nickname';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [language, setLanguage] = useState<'ja' | 'en'>('ja');

  useEffect(() => {
    document.title = 'プレイヤー設定 | Five Cucumber';
    
    // デバッグ用: window.resetProfile() をグローバルに公開
    (window as any).resetProfile = resetProfile;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // クライアント側バリデーション
    const r = validateNickname(nickname);
    if (!r.ok) {
      setError(r.reason === "length" ? "1〜8文字で入力してください" : "利用できない文字が含まれています");
      setIsSubmitting(false);
      return;
    }

    try {
      // サーバ側で重複チェック
      const response = await fetch('/api/username/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: r.value }),
      });

      const data = await response.json();

      if (!data.ok) {
        if (data.reason === 'duplicate') {
          setError('このユーザー名はすでにつかわれています');
        } else if (data.reason === 'length' || data.reason === 'charset') {
          setError(data.reason === 'length' ? '1〜8文字で入力してください' : '利用できない文字が含まれています');
        } else {
          setError('登録に失敗しました');
        }
        setIsSubmitting(false);
        return;
      }

      // プロフィール保存
      setProfile({ nickname: r.value });
      
      // Cookie設定
      setHasProfile(true);
      
      // 遷移
      const returnTo = searchParams.get('returnTo');
      router.replace(returnTo || '/home');
    } catch (err) {
      setError('登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLanguageToggle = () => {
    setLanguage(prev => prev === 'ja' ? 'en' : 'ja');
  };

  return (
    <main className="min-h-screen grid place-items-center bg-transparent">
      <div className="max-w-md w-[min(92vw,560px)] bg-transparent">
        <h1 className="text-2xl font-bold mb-6 text-center text-white">プレイヤー設定</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ニックネーム入力 */}
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium mb-2 text-white">
              ニックネーム（1–8文字）
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setError(null);
              }}
              className="w-full px-3 py-2 bg-transparent border border-white/50 rounded-md focus:outline-none focus:ring-2 focus:ring-white/70 text-white placeholder-white/70"
              placeholder="ニックネームを入力"
              maxLength={8}
              required
              autoFocus
            />
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleLanguageToggle}
              className="flex-1 py-2 px-4 bg-transparent border border-white/50 rounded-md hover:bg-white/10 transition-colors text-white"
            >
              言語切替
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !nickname.trim()}
              className="flex-1 py-2 px-4 bg-white text-black rounded-md hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSubmitting ? '登録中...' : '登録'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SetupForm />
    </Suspense>
  );
}
