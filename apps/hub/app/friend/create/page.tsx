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
    <main className="page-home min-h-screen w-full pt-20">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-8">ルーム作成</h1>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md mx-auto">
            <div className="space-y-6">
              {/* 人数 */}
              <div>
                <label className="block text-sm font-medium mb-2">人数</label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4, 5, 6].map(num => (
                    <button
                      key={num}
                      onClick={() => handleSettingChange('size', num)}
                      className={`opt ${settings.size === num ? 'selected' : ''}`}
                      aria-pressed={settings.size === num}
                    >
                      {num}人
                    </button>
                  ))}
                </div>
              </div>

              {/* きゅうり数 */}
              <div>
                <label className="block text-sm font-medium mb-2">きゅうり数</label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 4, 5, 6, 7].map(num => (
                    <button
                      key={num}
                      onClick={() => handleSettingChange('cucumber', num)}
                      className={`opt ${settings.cucumber === num ? 'selected' : ''}`}
                      aria-pressed={settings.cucumber === num}
                    >
                      {num}本
                    </button>
                  ))}
                </div>
              </div>

              {/* 制限時間 */}
              <div>
                <label className="block text-sm font-medium mb-2">制限時間（秒）</label>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 15, 20, 30, 60].map(num => (
                    <button
                      key={num}
                      onClick={() => handleSettingChange('limit', num)}
                      className={`opt ${settings.limit === num ? 'selected' : ''}`}
                      aria-pressed={settings.limit === num}
                    >
                      {num}秒
                    </button>
                  ))}
                </div>
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
