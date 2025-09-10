// apps/hub/app/(routes)/auth/login/page.tsx
'use client';

import { Button } from '@/packages/ui/src/Button';
import React, { useState } from 'react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [language, setLanguage] = useState<'ja' | 'en'>('ja');

  const t = {
    ja: {
      login: 'ログイン',
      createAccount: 'アカウント新規作成',
      guestPlay: 'ゲストとして利用',
      email: 'メールアドレス',
      username: 'ユーザー名',
      emailPlaceholder: 'your@email.com',
      usernamePlaceholder: 'お名前',
      submit: '送信',
      switchToLogin: 'ログインに戻る',
      switchToSignup: 'アカウントを作成',
      or: 'または',
    },
    en: {
      login: 'Login',
      createAccount: 'Create New Account',
      guestPlay: 'Play as Guest',
      email: 'Email Address',
      username: 'Username',
      emailPlaceholder: 'your@email.com',
      usernamePlaceholder: 'Your name',
      submit: 'Submit',
      switchToLogin: 'Back to Login',
      switchToSignup: 'Create Account',
      or: 'or',
    },
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(isLogin ? 'Login' : 'Signup', { email, username });
  };

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-fixed bg-no-repeat flex items-center justify-center"
      style={{
        backgroundImage: 'url(/assets/背景３.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
      }}
    >
      {/* 言語切替 - 左上の植物を避けて配置 */}
      <div className="absolute top-[10%] left-[10%] z-10">
        <button
          onClick={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
          className="px-4 py-2 rounded-full bg-[var(--paper)] bg-opacity-95 text-[var(--ink)] text-sm font-medium border-2 border-[var(--brass)] hover:bg-[var(--gold)] hover:text-[var(--paper)] transition-all duration-200 shadow-lg"
          style={{
            boxShadow: '0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          {language === 'ja' ? 'English' : '日本語'}
        </button>
      </div>

      {/* メインコンテナ - 中央の無地エリアに配置 */}
      <div className="w-full max-w-sm mx-auto px-4">
        {/* アンティーク風カード */}
        <div
          className="relative bg-[var(--paper)] rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--paper) 0%, rgba(230,220,201,0.98) 100%)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px var(--paper-edge)',
          }}
        >
          {/* 装飾的な上部ボーダー */}
          <div
            className="h-1 w-full"
            style={{
              background:
                'linear-gradient(90deg, var(--brass) 0%, var(--gold) 50%, var(--brass) 100%)',
            }}
          />

          {/* コンテンツ */}
          <div className="p-8">
            {/* タイトル - アンティーク風装飾 */}
            <div className="text-center mb-8">
              <div className="inline-block relative">
                <h1 className="text-3xl font-bold text-[var(--ink)] tracking-wider relative z-10">
                  {isLogin ? t[language].login : t[language].createAccount}
                </h1>
                {/* 装飾的な下線 */}
                <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--brass)] to-transparent opacity-60" />
              </div>
            </div>

            {isLogin ? (
              /* ログインフォーム */
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-[var(--ink)] tracking-wide uppercase opacity-80"
                  >
                    {t[language].email}
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t[language].emailPlaceholder}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-white bg-opacity-60 border-2 border-[var(--paper-edge)] text-[var(--ink)] placeholder-[var(--ink)] placeholder-opacity-40 focus:outline-none focus:ring-2 focus:ring-[var(--brass)] focus:border-[var(--brass)] focus:bg-opacity-80 transition-all duration-200"
                    style={{
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
                    }}
                  />
                </div>

                <div className="space-y-4 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full relative overflow-hidden group"
                  >
                    <span className="relative z-10">{t[language].login}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--brass)] via-[var(--gold)] to-[var(--brass)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Button>

                  {/* 区切り線 */}
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[var(--paper-edge)] opacity-50" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-3 bg-[var(--paper)] text-[var(--ink)] opacity-60 uppercase tracking-wider">
                        {t[language].or}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="w-full"
                    onClick={() => setIsLogin(false)}
                  >
                    {t[language].switchToSignup}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    className="w-full"
                    onClick={() => (window.location.href = '/home?guest=true')}
                  >
                    {t[language].guestPlay}
                  </Button>
                </div>
              </form>
            ) : (
              /* アカウント作成フォーム */
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="username"
                    className="block text-sm font-semibold text-[var(--ink)] tracking-wide uppercase opacity-80"
                  >
                    {t[language].username}
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder={t[language].usernamePlaceholder}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-white bg-opacity-60 border-2 border-[var(--paper-edge)] text-[var(--ink)] placeholder-[var(--ink)] placeholder-opacity-40 focus:outline-none focus:ring-2 focus:ring-[var(--brass)] focus:border-[var(--brass)] focus:bg-opacity-80 transition-all duration-200"
                    style={{
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="email-signup"
                    className="block text-sm font-semibold text-[var(--ink)] tracking-wide uppercase opacity-80"
                  >
                    {t[language].email}
                  </label>
                  <input
                    type="email"
                    id="email-signup"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t[language].emailPlaceholder}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-white bg-opacity-60 border-2 border-[var(--paper-edge)] text-[var(--ink)] placeholder-[var(--ink)] placeholder-opacity-40 focus:outline-none focus:ring-2 focus:ring-[var(--brass)] focus:border-[var(--brass)] focus:bg-opacity-80 transition-all duration-200"
                    style={{
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
                    }}
                  />
                </div>

                <div className="space-y-4 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full relative overflow-hidden group"
                  >
                    <span className="relative z-10">{t[language].createAccount}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--brass)] via-[var(--gold)] to-[var(--brass)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    className="w-full"
                    onClick={() => setIsLogin(true)}
                  >
                    {t[language].switchToLogin}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* 装飾的な下部ボーダー */}
          <div
            className="h-1 w-full"
            style={{
              background:
                'linear-gradient(90deg, var(--brass) 0%, var(--gold) 50%, var(--brass) 100%)',
            }}
          />
        </div>

        {/* カード下の装飾的な影 */}
        <div
          className="h-2 w-[95%] mx-auto -mt-1 rounded-b-2xl opacity-20"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)',
          }}
        />
      </div>
    </div>
  );
}
