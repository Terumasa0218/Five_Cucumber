'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CpuSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    players: 4,
    cucumber: 5,
    timeLimit: 15,
    difficulty: 'normal'
  });

  useEffect(() => {
    document.title = 'CPU設定 | Five Cucumber';
  }, []);

  const handleSettingChange = (key: string, value: string | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const isAllSettingsComplete = settings.players && settings.cucumber && settings.timeLimit && settings.difficulty;

  const handleStartGame = () => {
    if (isAllSettingsComplete) {
      router.push('/play/cpu');
    }
  };

  return (
    <main className="min-h-screen w-full pt-20">
      <div className="container mx-auto px-4">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">CPU設定</h1>
          <Link 
            href="/home" 
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            ホーム
          </Link>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            {/* 対戦人数 */}
            <div>
              <label className="block text-sm font-medium mb-2">対戦人数</label>
              <select
                value={settings.players}
                onChange={(e) => handleSettingChange('players', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={2}>2人</option>
                <option value={3}>3人</option>
                <option value={4}>4人</option>
                <option value={5}>5人</option>
                <option value={6}>6人</option>
              </select>
            </div>

            {/* お漬物きゅうり数 */}
            <div>
              <label className="block text-sm font-medium mb-2">お漬物きゅうり数</label>
              <select
                value={settings.cucumber}
                onChange={(e) => handleSettingChange('cucumber', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={3}>3本</option>
                <option value={4}>4本</option>
                <option value={5}>5本</option>
                <option value={6}>6本</option>
                <option value={7}>7本</option>
              </select>
            </div>

            {/* 制限時間 */}
            <div>
              <label className="block text-sm font-medium mb-2">制限時間（秒）</label>
              <select
                value={settings.timeLimit}
                onChange={(e) => handleSettingChange('timeLimit', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10秒</option>
                <option value={15}>15秒</option>
                <option value={20}>20秒</option>
                <option value={30}>30秒</option>
                <option value={60}>60秒</option>
              </select>
            </div>

            {/* CPU難易度 */}
            <div>
              <label className="block text-sm font-medium mb-2">CPU難易度</label>
              <select
                value={settings.difficulty}
                onChange={(e) => handleSettingChange('difficulty', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="easy">簡単</option>
                <option value="normal">普通</option>
                <option value="hard">難しい</option>
              </select>
            </div>

            {/* ゲーム開始ボタン */}
            <button
              onClick={handleStartGame}
              disabled={!isAllSettingsComplete}
              className={`w-full py-3 rounded-md font-semibold transition-colors ${
                isAllSettingsComplete
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              ゲーム開始
            </button>

            <p className="text-sm text-gray-500 text-center">
              初期配布枚数: 7枚固定
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
