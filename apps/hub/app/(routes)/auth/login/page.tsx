/* ログイン画面：半透明カードで視線を集中 */
'use client';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { getFirebaseClient } from '../../../../lib/firebase';

function setCookie(k: string, v: string, days = 30) {
  if (typeof document === 'undefined') return;
  const max = days * 24 * 60 * 60;
  document.cookie = `${k}=${v}; Max-Age=${max}; Path=/; SameSite=Lax`;
}

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get('returnTo') ?? '/home';
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: ''
  });
  
  const errorRef = useRef<HTMLDivElement>(null);

  // ページタイトルを設定
  useEffect(() => {
    document.title = 'ログイン | Five Cucumber';
  }, []);

  const go = () => {
    try { router.replace(returnTo); }
    catch { window.location.assign(returnTo); }
  };

  const handleGuest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setCookie('fc_session', 'guest');
      go();
    } catch (err) {
      setError('ゲストログインに失敗しました');
      errorRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const fb = getFirebaseClient();
      if (!fb) {
        throw new Error('Firebase認証が利用できません');
      }
      
      if (mode === 'signup') {
        // 新規作成
        const userCredential = await createUserWithEmailAndPassword(fb.auth, formData.email, formData.password);
        if (formData.displayName) {
          await updateProfile(userCredential.user, { displayName: formData.displayName });
        }
      } else {
        // ログイン
        await signInWithEmailAndPassword(fb.auth, formData.email, formData.password);
      }
      
      setCookie('fc_session', 'user');
      go();
    } catch (err: any) {
      let errorMessage = 'ログインに失敗しました';
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'ユーザーが見つかりません';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'パスワードが間違っています';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'このメールアドレスは既に登録されています';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'パスワードは6文字以上で入力してください';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません';
      }
      setError(errorMessage);
      errorRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin(e);
    }
  };

  return (
    <main className="min-h-[100svh] w-full flex items-center justify-center">
      <div className="safe-zone">
        <div className="max-w-md mx-auto">
          <div className="card">
            <h1 className="font-heading text-3xl text-center text-[var(--antique-ink)] mb-8">
              {mode === 'login' ? 'ログイン' : 'アカウント新規作成'}
            </h1>
            
            {/* エラー表示 */}
            {error && (
              <div 
                ref={errorRef}
                className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg"
                role="alert"
                aria-live="polite"
                tabIndex={-1}
              >
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              {/* Primary: ゲストで今すぐ遊ぶ */}
              <button
                onClick={handleGuest}
                disabled={isLoading}
                className="btn-primary w-full min-h-[44px] disabled:opacity-50"
              >
                {isLoading ? '処理中...' : 'ゲストで今すぐ遊ぶ'}
              </button>
              
              {/* フォーム */}
              <form onSubmit={handleLogin} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-[var(--antique-ink)] mb-1">
                      ユーザー名
                    </label>
                    <input
                      type="text"
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      className="w-full px-3 py-2 border border-[var(--antique-border)] rounded-lg bg-white/10 backdrop-blur-sm text-[var(--antique-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--antique-forest)]"
                      placeholder="ユーザー名を入力"
                    />
                  </div>
                )}
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--antique-ink)] mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    className="w-full px-3 py-2 border border-[var(--antique-border)] rounded-lg bg-white/10 backdrop-blur-sm text-[var(--antique-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--antique-forest)]"
                    placeholder="メールアドレスを入力"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[var(--antique-ink)] mb-1">
                    パスワード
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    className="w-full px-3 py-2 border border-[var(--antique-border)] rounded-lg bg-white/10 backdrop-blur-sm text-[var(--antique-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--antique-forest)]"
                    placeholder="パスワードを入力"
                    required
                    minLength={6}
                  />
                </div>
                
                {/* Secondary: ログイン/新規作成 */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-secondary w-full min-h-[44px] disabled:opacity-50"
                >
                  {isLoading ? '処理中...' : (mode === 'login' ? 'ログイン' : 'アカウント作成')}
                </button>
              </form>
              
              {/* Link: モード切り替え */}
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setError(null);
                  setFormData({ email: '', password: '', displayName: '' });
                }}
                className="btn-link w-full text-center block min-h-[44px]"
              >
                {mode === 'login' ? 'アカウント新規作成' : 'ログイン'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-[100svh] w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--antique-forest)] mx-auto mb-4"></div>
          <p className="font-body text-[var(--antique-muted)]">読み込み中...</p>
        </div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}