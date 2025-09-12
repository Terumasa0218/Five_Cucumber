'use client';

import { useI18n } from '@/hooks/useI18n';
import { getProfile } from '@/lib/profile';
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [gateStatus, setGateStatus] = useState<string>('');
  const [profile, setProfile] = useState(getProfile());
  const { language, changeLanguage, t } = useI18n();

  useEffect(() => {
    document.title = `${t('homeTitle')} | Five Cucumber`;
    
    // middleware判定ヘッダを取得（開発時のみ表示）
    fetch('/home', { method: 'HEAD' })
      .then(response => {
        const gateHeader = response.headers.get('x-profile-gate');
        setGateStatus(gateHeader || 'unknown');
      })
      .catch(() => setGateStatus('error'));
    
    // プロフィール変更を監視
    const handleStorageChange = () => {
      setProfile(getProfile());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <main className="page-home min-h-screen w-full pt-20">
      <div className="container mx-auto px-4">
        {/* 見出し */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t('homeTitle')}
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            {t('homeSubtitle')}
          </p>
          {profile?.nickname && (
            <p className="text-sm text-blue-600 font-medium">
              {t('welcomeMessage', { name: profile.nickname })}
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
        <div className="max-w-2xl mx-auto space-y-6">
          {/* CPU対戦 */}
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-2 border-blue-300 hover:shadow-lg transition-all">
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2 text-blue-800">
                🎮 {t('cpuBattle')}
              </h2>
              <p className="text-blue-700">
                {language === 'ja' ? '設定してすぐに開始' : 'Start immediately with settings'}
              </p>
            </div>
            <Link 
              href="/cucumber/cpu/settings" 
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md"
            >
              {t('start')}
            </Link>
          </div>

          {/* オンライン対戦 */}
          <div className="flex items-center justify-between p-6 bg-gray-50 rounded-lg border border-gray-200 opacity-60">
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">
                {t('onlineBattle')}
              </h2>
              <p className="text-gray-600">
                {language === 'ja' ? '4人固定・10秒固定・近日公開' : '4 players fixed, 10 seconds fixed, coming soon'}
              </p>
            </div>
            <button 
              disabled 
              className="px-6 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed"
            >
              {t('comingSoon')}
            </button>
          </div>

          {/* フレンド対戦 */}
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border-2 border-green-300 hover:shadow-lg transition-all">
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2 text-green-800">
                👥 {t('friendBattle')}
              </h2>
              <p className="text-green-700">
                {language === 'ja' ? 'フレンドを招待して対戦' : 'Invite friends to battle'}
              </p>
            </div>
            <Link 
              href="/friend" 
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-md"
            >
              {t('start')}
            </Link>
          </div>
        </div>

        {/* 下部リンク */}
        <div className="text-center mt-12 space-x-6">
          <Link href="/rules" className="text-blue-600 hover:text-blue-800">
            {t('rules')}
          </Link>
          <button 
            onClick={() => changeLanguage(language === 'ja' ? 'en' : 'ja')}
            className="text-blue-600 hover:text-blue-800"
          >
            {t('language')}
          </button>
        </div>
      </div>
    </main>
  );
}
