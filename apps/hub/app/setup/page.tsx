'use client';

import { setProfile, setHasProfile, validateNickname, resetProfile } from '@/lib/profile';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

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

    // バリデーション
    const validation = validateNickname(nickname);
    if (!validation.valid) {
      setError(validation.error || 'エラーが発生しました');
      setIsSubmitting(false);
      return;
    }

    try {
      // プロフィール保存
      setProfile({ nickname });
      
      // Cookie設定
      setHasProfile(true);
      
      // 遷移
      const returnTo = searchParams.get('returnTo');
      router.replace(returnTo || '/home');
    } catch (err) {
      setError('保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLanguageToggle = () => {
    setLanguage(prev => prev === 'ja' ? 'en' : 'ja');
  };

  return (
    <main className="min-h-screen w-full bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/assets/背景４.png)' }}>
      <div className="min-h-screen bg-black/20 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-xl">
          <h1 className="text-2xl font-bold mb-6 text-center">プレイヤー設定</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ニックネーム入力 */}
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium mb-2">
                ニックネーム (1-8文字)
              </label>
              <input
                type="text"
                id="nickname"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setError(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ニックネームを入力"
                maxLength={8}
                required
                autoFocus
              />
            </div>

            {/* 言語切替 */}
            <div>
              <button
                type="button"
                onClick={handleLanguageToggle}
                className="w-full py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                言語切替: {language === 'ja' ? '日本語' : 'English'}
              </button>
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            {/* 保存ボタン */}
            <button
              type="submit"
              disabled={isSubmitting || !nickname.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </form>
        </div>
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
