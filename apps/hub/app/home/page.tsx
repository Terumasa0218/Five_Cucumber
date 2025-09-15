'use client';

import { useI18n } from '@/hooks/useI18n';
import { getNickname } from '@/lib/profile';
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [gateStatus, setGateStatus] = useState<string>('');
  const [nickname, setNickname] = useState<string | null>(null);
  const { language, changeLanguage, t } = useI18n();

  useEffect(() => {
    document.title = `${t('homeTitle')} | Five Cucumber`;
    
    // ホーム背景を設定とスクロール禁止
    document.body.setAttribute('data-bg', 'home');
    document.body.classList.add('no-scroll');
    
    // ニックネームを取得
    setNickname(getNickname());
    
    // middleware判定ヘッダを取得（開発時のみ表示）
    if (process.env.NODE_ENV === 'development') {
      fetch('/home', { method: 'HEAD' })
        .then(response => {
          const gateHeader = response.headers.get('x-profile-gate');
          setGateStatus(gateHeader || 'unknown');
        })
        .catch(() => setGateStatus('error'));
    }
    
    // プロフィール変更を監視
    const handleStorageChange = () => {
      setNickname(getNickname());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      // ホームページを離れる時に背景属性とスクロール設定をクリア
      document.body.removeAttribute('data-bg');
      document.body.classList.remove('no-scroll');
    };
  }, [t]);

  return (
    <main className="page-home h-screen w-full flex items-center justify-center relative overflow-auto">
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
      
      <div className="relative z-10 container mx-auto px-4 max-w-4xl">
        {/* 中央コンテンツ */}
        <div className="text-center mb-12 bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20">
          <h1 className="sr-only" aria-label={t('homeTitle')}>
            {t('homeTitle')}
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-4 font-medium">
            {t('homeSubtitle')}
          </p>
          {nickname && (
            <p className="text-base text-green-700 font-semibold bg-green-50 rounded-full px-4 py-2 inline-block">
              {t('welcomeMessage', { name: nickname })}
            </p>
          )}
          {!nickname && (
            <p className="text-base text-gray-600 bg-gray-50 rounded-full px-4 py-2 inline-block">
              ユーザー名: 未設定
            </p>
          )}
          
          {/* デバッグ情報（開発時のみ） */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Middleware Status:</strong> {gateStatus}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                allow: 許可パス / passed: 認証済み / required: 未認証→/setup
              </p>
            </div>
          )}
        </div>

        {/* モード選択 */}
        <div className="max-w-3xl mx-auto space-y-6">
          {/* CPU対戦 */}
          <div className="flex items-center justify-between p-6 bg-white/95 backdrop-blur-md rounded-2xl border-2 border-blue-200 hover:shadow-2xl transition-all hover:scale-[1.02] hover:border-blue-400">
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold mb-2 text-blue-800">
                🎮 {t('cpuBattle')}
              </h2>
              <p className="text-blue-700 text-base md:text-lg">
                {language === 'ja' ? '設定してすぐに開始' : 'Start immediately with settings'}
              </p>
            </div>
            <Link 
              href="/cucumber/cpu/settings" 
              className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg hover:shadow-xl text-lg"
            >
              {t('start')}
            </Link>
          </div>

          {/* オンライン対戦 */}
          <div className="flex items-center justify-between p-6 bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200 opacity-70">
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold mb-2 text-gray-700">
                🌐 {t('onlineBattle')}
              </h2>
              <p className="text-gray-600 text-base md:text-lg">
                {language === 'ja' ? '4人固定・10秒固定・近日公開' : '4 players fixed, 10 seconds fixed, coming soon'}
              </p>
            </div>
            <button 
              disabled 
              className="px-6 py-3 bg-gray-400 text-white rounded-xl cursor-not-allowed font-bold text-lg"
            >
              {t('comingSoon')}
            </button>
          </div>

          {/* フレンド対戦 */}
          <div className="flex items-center justify-between p-6 bg-white/95 backdrop-blur-md rounded-2xl border-2 border-green-200 hover:shadow-2xl transition-all hover:scale-[1.02] hover:border-green-400">
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold mb-2 text-green-800">
                👥 {t('friendBattle')}
              </h2>
              <p className="text-green-700 text-base md:text-lg">
                {language === 'ja' ? 'フレンドを招待して対戦' : 'Invite friends to battle'}
              </p>
            </div>
            <Link 
              href="/friend" 
              className="px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-bold shadow-lg hover:shadow-xl text-lg"
            >
              {t('start')}
            </Link>
          </div>
        </div>

        {/* 下部リンク */}
        <div className="text-center mt-12 space-x-8 bg-white/80 backdrop-blur-md rounded-2xl p-4 inline-block">
          <Link 
            href="/rules" 
            className="text-blue-700 hover:text-blue-900 font-semibold text-lg hover:underline transition-colors"
          >
            {t('rules')}
          </Link>
          <button 
            onClick={() => changeLanguage(language === 'ja' ? 'en' : 'ja')}
            className="text-blue-700 hover:text-blue-900 font-semibold text-lg hover:underline transition-colors"
          >
            {t('language')}
          </button>
        </div>
      </div>
    </main>
  );
}
