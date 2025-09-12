'use client';

import { getNickname } from "@/utils/user";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function FriendCreatePage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    roomSize: 4,
    turnSeconds: 15,
    maxCucumbers: 6
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    document.title = 'ルーム作成 | Five Cucumber';
  }, []);

  const handleCreateRoom = async () => {
    const nickname = getNickname();
    if (!nickname) {
      router.push('/setup?returnTo=/friend/create');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/friend/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomSize: settings.roomSize, 
          nickname,
          turnSeconds: settings.turnSeconds,
          maxCucumbers: settings.maxCucumbers
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.roomId) {
          router.push(`/friend/room/${data.roomId}`);
        } else {
          setError('ルーム作成に失敗しました');
        }
      } else {
        switch (res.status) {
          case 400:
            setError('入力内容に問題があります');
            break;
          case 500:
            setError('サーバーエラーが発生しました');
            break;
          default:
            setError('ルーム作成に失敗しました');
        }
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="page-home min-h-screen w-full pt-20 relative">
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-8 text-white drop-shadow-lg">ルーム作成</h1>
          
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* 人数選択 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-xl font-semibold mb-4">人数</h3>
              <div className="grid grid-cols-5 gap-3">
                {[2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => handleSettingChange('roomSize', num)}
                    className={`opt ${settings.roomSize === num ? 'selected' : ''}`}
                    aria-pressed={settings.roomSize === num}
                    disabled={isCreating}
                  >
                    {num}人
                  </button>
                ))}
              </div>
            </div>

            {/* 制限時間 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-xl font-semibold mb-4">制限時間</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 10, label: '10秒' },
                  { value: 15, label: '15秒' },
                  { value: 30, label: '30秒' },
                  { value: 0, label: '無制限' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleSettingChange('turnSeconds', option.value)}
                    className={`opt ${settings.turnSeconds === option.value ? 'selected' : ''}`}
                    aria-pressed={settings.turnSeconds === option.value}
                    disabled={isCreating}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* きゅうり上限 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-xl font-semibold mb-4">きゅうり上限</h3>
              <div className="grid grid-cols-3 gap-3">
                {[4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => handleSettingChange('maxCucumbers', num)}
                    className={`opt ${settings.maxCucumbers === num ? 'selected' : ''}`}
                    aria-pressed={settings.maxCucumbers === num}
                    disabled={isCreating}
                  >
                    {num}本
                  </button>
                ))}
              </div>
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className={`w-full py-3 rounded-md font-semibold transition-colors ${
                isCreating
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isCreating ? '作成中...' : 'ルーム作成'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
