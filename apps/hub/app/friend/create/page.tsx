'use client';

import { createRoom } from "@/lib/roomMock";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function FriendCreatePage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    size: 4,
    cucumber: 5,
    limit: 15
  });

  useEffect(() => {
    document.title = 'ルーム作成 | Five Cucumber';
  }, []);

  const handleSettingChange = (key: string, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const isAllSettingsComplete = settings.size && settings.cucumber && settings.limit;

  const handleCreateRoom = () => {
    if (isAllSettingsComplete) {
      const room = createRoom(settings);
      router.push(`/room/${room.code}`);
    }
  };

  return (
    <main className="min-h-screen w-full pt-20">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-8">ルーム作成</h1>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md mx-auto">
            <div className="space-y-6">
              {/* 人数 */}
              <div>
                <label className="block text-sm font-medium mb-2">人数</label>
                <select
                  value={settings.size}
                  onChange={(e) => handleSettingChange('size', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={2}>2人</option>
                  <option value={3}>3人</option>
                  <option value={4}>4人</option>
                  <option value={5}>5人</option>
                  <option value={6}>6人</option>
                </select>
              </div>

              {/* きゅうり数 */}
              <div>
                <label className="block text-sm font-medium mb-2">きゅうり数</label>
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
                  value={settings.limit}
                  onChange={(e) => handleSettingChange('limit', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10秒</option>
                  <option value={15}>15秒</option>
                  <option value={20}>20秒</option>
                  <option value={30}>30秒</option>
                  <option value={60}>60秒</option>
                </select>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={!isAllSettingsComplete}
                className={`w-full py-3 rounded-md font-semibold transition-colors ${
                  isAllSettingsComplete
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                ルーム作成
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
