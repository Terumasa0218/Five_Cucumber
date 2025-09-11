'use client';

import { fetchJSON } from '@/lib/http';
import { validateNickname } from '@/lib/nickname';
import { resetProfile, setHasProfile, setProfile } from '@/lib/profile';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [language, setLanguage] = useState<'ja' | 'en'>('ja');
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);

  useEffect(() => {
    document.title = 'プレイヤー設定 | Five Cucumber';
    
    // デバッグ用: window.resetProfile() をグローバルに公開
    (window as any).resetProfile = resetProfile;
    
    // デバッグモードの確認
    setIsDebugMode(searchParams.get('debug') === '1');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setDiagnostic(null);

    // クライアント側バリデーション
    const r = validateNickname(nickname);
    
    if (!r.ok) {
      const errorMsg = r.reason === "length" ? "1〜8文字で入力してください" : "利用できない文字が含まれています";
      setError(errorMsg);
      setIsSubmitting(false);
      return;
    }

    // fetchJSONを使用してサーバ側で重複チェック
    const response = await fetchJSON('/api/username/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: r.value }),
      timeoutMs: 8000,
    });

    // 診断情報を保存
    setDiagnostic({
      status: response.status,
      body: response.json ?? response.text ?? null,
      error: response.error
    });

    if (!response.ok) {
      const reason = response.json?.reason ?? (response.status >= 500 ? "server" : "network");
      const errorMsg = 
        reason === "duplicate" ? "このユーザー名はすでにつかわれています" :
        reason === "length"    ? "1〜8文字で入力してください" :
        reason === "charset"   ? "利用できない文字が含まれています" :
        reason === "server"    ? `登録に失敗しました（サーバエラー: ${response.json?.error || 'Unknown'}）` :
                                  "通信に失敗しました。電波状況を確認して再試行してください";
      
      setError(errorMsg);
      setIsSubmitting(false);
      return;
    }

    // プロフィール保存
    setProfile({ nickname: r.value });
    
    // Cookie設定（サーバ側で設定されるが、クライアント側でも設定）
    setHasProfile(true);
    
    // 遷移
    const returnTo = searchParams.get('returnTo');
    router.replace(returnTo || '/home');
  };

  const handleLanguageToggle = () => {
    setLanguage(prev => prev === 'ja' ? 'en' : 'ja');
  };

  const handleNetworkTest = async () => {
    const result = await fetchJSON('/api/ping', { timeoutMs: 5000 });
    setDiagnostic((prev: any) => ({
      ...prev,
      networkTest: {
        status: result.status,
        body: result.json,
        timestamp: Date.now()
      }
    }));
  };

  const copyDiagnosticInfo = async () => {
    const info = {
      ua: navigator.userAgent,
      online: navigator.onLine,
      status: diagnostic?.status,
      body: diagnostic?.body,
      error: diagnostic?.error,
      cookies: document.cookie.substring(0, 200),
      profile: localStorage.getItem('profile'),
      networkTest: diagnostic?.networkTest,
      timestamp: Date.now(),
      nickname: nickname,
      nicknameLength: nickname.length,
      nicknameTrimmed: nickname.trim(),
      nicknameTrimmedLength: nickname.trim().length
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(info, null, 2));
      alert('診断情報をコピーしました');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('コピーに失敗しました');
    }
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
              disabled={isSubmitting || nickname.length === 0}
              className="flex-1 py-2 px-4 bg-white text-black rounded-md hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSubmitting ? '登録中...' : '登録'}
            </button>
          </div>
        </form>

        {/* デバッグパネル */}
        {isDebugMode && (
          <div className="mt-8 p-4 bg-black/50 border border-white/30 rounded-md text-white text-xs">
            <h3 className="font-bold mb-3 text-yellow-400">🔧 デバッグ情報</h3>
            
            <div className="space-y-2 mb-4">
              <div><strong>User Agent:</strong> {navigator.userAgent}</div>
              <div><strong>Online:</strong> {navigator.onLine ? 'Yes' : 'No'}</div>
              <div><strong>Cookies:</strong> {document.cookie.substring(0, 100)}...</div>
              <div><strong>Profile:</strong> {localStorage.getItem('profile') || 'None'}</div>
              <div><strong>Current Input:</strong> "{nickname}" (length: {nickname.length})</div>
              <div><strong>Trimmed:</strong> "{nickname.trim()}" (length: {nickname.trim().length})</div>
            </div>

            {diagnostic && (
              <div className="space-y-2 mb-4">
                <div><strong>Last Request Status:</strong> {diagnostic.status}</div>
                <div><strong>Response Body:</strong> {JSON.stringify(diagnostic.body)}</div>
                {diagnostic.error && <div><strong>Error:</strong> {diagnostic.error}</div>}
                {diagnostic.networkTest && (
                  <div>
                    <strong>Network Test:</strong> Status {diagnostic.networkTest.status} - {JSON.stringify(diagnostic.networkTest.body)}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleNetworkTest}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs"
              >
                ネットワークテスト
              </button>
              <button
                onClick={copyDiagnosticInfo}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-xs"
              >
                診断情報をコピー
              </button>
            </div>
          </div>
        )}
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
