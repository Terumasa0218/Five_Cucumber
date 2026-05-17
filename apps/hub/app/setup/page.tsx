'use client';

import { useI18n } from '@/hooks/useI18n';
import { apiJson, ApiRequestError } from '@/lib/api';
import { validateNickname } from '@/lib/nickname';
import { getProfile, resetProfile, setProfile } from '@/lib/profile';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

interface DiagnosticInfo {
  status: number;
  body: unknown;
  error: string | null;
  networkTest?: {
    status: number;
    body: unknown;
    timestamp: number;
  };
}

interface RegisterResponse {
  ok: boolean;
  reason?: 'duplicate' | 'conflict' | 'length' | 'charset' | 'bad-request' | 'bad-nickname' | 'server-error';
  error?: string;
}

function shouldUseLocalProfileFallback(status: number, reason?: string): boolean {
  return status === 0 || status === 401 || status === 503 || status >= 500 || reason === 'server-error';
}

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticInfo | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { language, changeLanguage } = useI18n();

  useEffect(() => {
    document.title = 'プレイヤー設定 | Five Cucumber';
    
    // 既存プロフィールがあるかチェック
    const existingProfile = getProfile();
    if (existingProfile) {
      setNickname(existingProfile.nickname);
      setIsEditMode(true);
    }
    
    // デバッグ用: window.resetProfile() をグローバルに公開
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as typeof window & { resetProfile?: typeof resetProfile }).resetProfile = resetProfile;
    }
    
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

    const saveProfileAndContinue = () => {
      setProfile({ nickname: r.value });
      const returnTo = searchParams.get('returnTo');
      router.replace(returnTo || '/home');
    };

    // サーバ側で重複チェックできる場合は行い、ローカル環境ではプロフィール保存を優先する
    try {
      const response = await apiJson<RegisterResponse>('/api/username/register', {
        method: 'POST',
        json: { name: r.value },
      });

      // 診断情報を保存（成功時）
      setDiagnostic({
        status: 200,
        body: response,
        error: null
      });

      saveProfileAndContinue();
    } catch (err) {
      let status = 0;
      let body: unknown = null;
      
      if (err instanceof ApiRequestError) {
        status = err.response.status;
        body = err.response.data;
        
        // 診断情報を保存（エラー時）
        setDiagnostic({
          status,
          body,
          error: err.message
        });
        
        const response = body as { reason?: string; error?: string };
        const reason = response?.reason ?? (status >= 500 ? "server" : "network");

        if (shouldUseLocalProfileFallback(status, reason)) {
          saveProfileAndContinue();
          return;
        }

        const errorMsg = 
          reason === "duplicate" || reason === "conflict" ? "このユーザー名はすでにつかわれています" :
          reason === "length" || reason === "bad-nickname" ? "1〜8文字で入力してください" :
          reason === "charset"   ? "利用できない文字が含まれています" :
          reason === "server" || reason === "server-error"
            ? `登録に失敗しました（サーバエラー: ${response?.error || 'Unknown'}）` :
            "通信に失敗しました。電波状況を確認して再試行してください";
        
        setError(errorMsg);
      } else {
        setDiagnostic({
          status: 0,
          body: null,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
        saveProfileAndContinue();
        return;
      }
      setIsSubmitting(false);
    }
  };

  const handleLanguageToggle = () => {
    changeLanguage(language === 'ja' ? 'en' : 'ja');
  };

  const handleNetworkTest = async () => {
    try {
      const result = await apiJson<{ ok: boolean; message?: string }>('/api/ping');
      setDiagnostic((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          networkTest: {
            status: 200,
            body: result,
            timestamp: Date.now()
          }
        };
      });
    } catch (err) {
      const status = err instanceof ApiRequestError ? err.response.status : 0;
      const body = err instanceof ApiRequestError ? err.response.data : null;
      setDiagnostic((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          networkTest: {
            status,
            body,
            timestamp: Date.now()
          }
        };
      });
    }
  };

  const copyDiagnosticInfo = async () => {
    const info = {
      ua: navigator.userAgent,
      online: navigator.onLine,
      status: diagnostic?.status,
      body: diagnostic?.body,
      error: diagnostic?.error,
      cookies: document.cookie.substring(0, 200),
      profile: localStorage.getItem('five-cucumber-profile'),
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
    <main className="page-home min-h-screen grid place-items-center bg-transparent">
      <div className="max-w-md w-[min(92vw,560px)] bg-transparent">
        <h1 className="text-2xl font-bold mb-6 text-center text-white">
          {isEditMode ? 'ニックネーム変更' : 'プレイヤー設定'}
        </h1>
        
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
              {isSubmitting ? (isEditMode ? '変更中...' : '決定中...') : (isEditMode ? '変更' : '決定')}
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
              <div><strong>Profile:</strong> {localStorage.getItem('five-cucumber-profile') || 'None'}</div>
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
