'use client';

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PlayCpuPage() {
  const router = useRouter();
  const [gameTime, setGameTime] = useState(0);

  useEffect(() => {
    document.title = 'CPU対戦 | Five Cucumber';
    
    // ダミーのゲームタイマー
    const timer = setInterval(() => {
      setGameTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleEndGame = () => {
    router.push('/cpu/settings');
  };

  return (
    <main className="min-h-screen w-full pt-20">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-8">CPU対戦</h1>
          
          <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">ゲーム中...</h2>
              <p className="text-gray-600 mb-4">
                プレースホルダー画面です
              </p>
              <p className="text-sm text-gray-500">
                経過時間: {gameTime}秒
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-semibold mb-2">プレイヤー状況</h3>
                <div className="space-y-2 text-sm">
                  <div>あなた: きゅうり 2本</div>
                  <div>CPU-A: きゅうり 1本</div>
                  <div>CPU-B: きゅうり 3本</div>
                  <div>CPU-C: きゅうり 1本</div>
                </div>
              </div>

              <button
                onClick={handleEndGame}
                className="w-full py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                対戦終了
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
