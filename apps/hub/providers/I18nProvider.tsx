'use client';

import React, { createContext, useContext, useState } from 'react';

interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, params?: Record<string, any>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Simple translation function
const translations: Record<string, Record<string, string>> = {
  ja: {
    'title.app': 'Game Hub',
    'title.home': 'ホーム',
    'title.stats': '統計',
    'title.settings': '設定',
    'title.cucumber5': 'Five Cucumbers',
    'label.online': 'オンライン',
    'label.playerCount': 'プレイヤー数',
    'label.players': 'プレイヤー',
    'msg.welcome': 'ようこそ、{{name}}さん！',
    'msg.noGamesAvailable': '利用可能なゲームがありません',
    'msg.gameOver': 'ゲーム終了',
    'btn.logout': 'ログアウト',
    'btn.newGame': '新しいゲーム',
    'btn.backToLobby': 'ロビーに戻る',
    'btn.start': 'ゲーム開始',
    'btn.join': '参加',
    'error.gameNotStarted': 'ゲームを開始できませんでした',
    'settings.language': '言語',
    'settings.theme': 'テーマ',
    'settings.theme.light': 'ライト',
    'settings.theme.dark': 'ダーク',
    'settings.sound': 'サウンド',
    'settings.animations': 'アニメーション',
    'settings.reducedMotion': 'モーション軽減',
    'tutorial.goal': 'きゅうりを5本集めないようにするカードゲーム',
    'stats.totalGames': '総ゲーム数',
    'stats.winRate': '勝率',
    'stats.avgGameTime': '平均ゲーム時間',
    'btn.playOnline': 'オンラインでプレイ',
    'btn.playAsGuest': 'ゲストとしてプレイ',
    'btn.login': 'ログイン',
    'tutorial.welcome': 'ようこそ！ゲストとしてプレイするか、Googleアカウントでログインしてください。',
    'error.loginFailed': 'ログインに失敗しました',
  },
  en: {
    'title.app': 'Five Cucumbers',
    'title.home': 'Home',
    'title.stats': 'Stats',
    'title.settings': 'Settings',
    'title.cucumber5': 'Five Cucumbers',
    'label.online': 'Online',
    'label.playerCount': 'Player Count',
    'label.players': 'Players',
    'msg.welcome': 'Welcome, {{name}}!',
    'msg.noGamesAvailable': 'No games available',
    'msg.gameOver': 'Game Over',
    'btn.logout': 'Logout',
    'btn.newGame': 'New Game',
    'btn.backToLobby': 'Back to Lobby',
    'btn.start': 'Start Game',
    'btn.join': 'Join',
    'error.gameNotStarted': 'Failed to start game',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.sound': 'Sound',
    'settings.animations': 'Animations',
    'settings.reducedMotion': 'Reduced Motion',
    'tutorial.goal': 'A card game where you try not to collect 5 cucumbers',
    'stats.totalGames': 'Total Games',
    'stats.winRate': 'Win Rate',
    'stats.avgGameTime': 'Avg Game Time',
    'btn.playOnline': 'Play Online',
    'btn.playAsGuest': 'Play as Guest',
    'btn.login': 'Login',
    'tutorial.welcome': 'Welcome! Play as a guest or sign in with your Google account.',
    'error.loginFailed': 'Login failed',
  },
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState('ja');

  const t = (key: string, params?: Record<string, any>): string => {
    let translation = translations[locale]?.[key] || key;
    
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        translation = translation.replace(`{{${paramKey}}}`, String(value));
      });
    }
    
    return translation;
  };

  const value = {
    locale,
    setLocale,
    t,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}