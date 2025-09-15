'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CpuSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    players: 4,
    turnSeconds: 15,
    maxCucumbers: 5,
    cpuLevel: 'normal' as 'easy' | 'normal' | 'hard',
    showAllHands: false
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleStart = () => {
    const config = {
      players: settings.players,
      turnSeconds: settings.turnSeconds === 0 ? null : settings.turnSeconds,
      maxCucumbers: settings.maxCucumbers,
      initialCards: 7,
      cpuLevel: settings.cpuLevel
    };
    
    // URLパラメータで設定を渡す
    const params = new URLSearchParams();
    params.set('players', config.players.toString());
    params.set('turnSeconds', config.turnSeconds?.toString() || '0');
    params.set('maxCucumbers', config.maxCucumbers.toString());
    params.set('cpuLevel', config.cpuLevel);
    
    router.push(`/cucumber/cpu/play?${params.toString()}`);
  };

  return (
    <main className="page-home h-screen w-full pt-20 overflow-auto">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* 見出し */}
        <div className="text-center mb-8">
          <h1 className="sr-only" aria-label="CPU対戦設定">
            CPU対戦設定
          </h1>
          <p className="text-lg text-gray-600">
            ゲームの設定を調整してください
          </p>
        </div>

        {/* 設定項目 */}
        <div className="space-y-8">
          {/* 対戦人数 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-semibold mb-4 text-center">対戦人数</h3>
            <div className="flex justify-center">
              <div className="grid grid-cols-3 gap-3 max-w-md">
              {[2, 3, 4, 5, 6].map(num => (
                <button
                  key={num}
                  onClick={() => handleSettingChange('players', num)}
                  className={`opt ${settings.players === num ? 'selected' : ''}`}
                  aria-pressed={settings.players === num}
                >
                  {num}人
                </button>
              ))}
              </div>
            </div>
          </div>

          {/* 制限時間 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-semibold mb-4 text-center">制限時間</h3>
            <div className="grid grid-cols-4 gap-3 justify-center">
              {[
                { value: 5, label: '5秒' },
                { value: 15, label: '15秒' },
                { value: 30, label: '30秒' },
                { value: 0, label: '無制限' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => handleSettingChange('turnSeconds', option.value)}
                  className={`opt ${settings.turnSeconds === option.value ? 'selected' : ''}`}
                  aria-pressed={settings.turnSeconds === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* お漬物きゅうり数 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-semibold mb-4 text-center">お漬物きゅうり数</h3>
            <div className="grid grid-cols-4 gap-3 justify-center">
              {[4, 5, 6, 7].map(num => (
                <button
                  key={num}
                  onClick={() => handleSettingChange('maxCucumbers', num)}
                  className={`opt ${settings.maxCucumbers === num ? 'selected' : ''}`}
                  aria-pressed={settings.maxCucumbers === num}
                >
                  {num}本
                </button>
              ))}
            </div>
          </div>

          {/* CPU難易度 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-semibold mb-4 text-center">CPU難易度</h3>
            <div className="grid grid-cols-3 gap-3 justify-center">
              {[
                { value: 'easy', label: '簡単' },
                { value: 'normal', label: '普通' },
                { value: 'hard', label: '難しい' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => handleSettingChange('cpuLevel', option.value)}
                  className={`opt ${settings.cpuLevel === option.value ? 'selected' : ''} text-center`}
                  aria-pressed={settings.cpuLevel === option.value}
                >
                  <div className="font-semibold">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* デバッグモード（開発時のみ） */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
              <h3 className="text-xl font-semibold mb-4 text-yellow-800">🔧 デバッグモード</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showAllHands}
                    onChange={(e) => handleSettingChange('showAllHands', e.target.checked)}
                    className="w-5 h-5 text-yellow-600"
                  />
                  <span className="text-yellow-800 font-medium">全員の手札を表示</span>
                </label>
                <span className="text-sm text-yellow-600">
                  （ゲームシステムの動作確認用）
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 開始ボタン */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleStart}
            className="px-12 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg"
          >
            はじめる
          </button>
        </div>

        {/* 戻るボタン */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => router.push('/home')}
            className="text-gray-600 hover:text-gray-800"
          >
            ← ホームに戻る
          </button>
        </div>
      </div>
    </main>
  );
}
