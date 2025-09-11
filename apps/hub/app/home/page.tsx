'use client';

import { useRequireNickname } from "@/hooks/useRequireNickname";
import Link from "next/link";
import { useEffect } from "react";

export default function Home() {
  // 初回アクセスで自動表示
  useRequireNickname({ mode: 'auto' });

  useEffect(() => {
    document.title = 'ホーム | Five Cucumber';
  }, []);

  return (
    <main className="min-h-screen w-full pt-20">
      <div className="container mx-auto px-4">
        {/* 見出し */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            ホーム
          </h1>
          <p className="text-lg text-gray-600">
            遊び方を選んでください。
          </p>
        </div>

        {/* モード選択 */}
        <div className="max-w-2xl mx-auto space-y-6">
          {/* CPU対戦 */}
          <div className="flex items-center justify-between p-6 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">
                CPU対戦
              </h2>
              <p className="text-gray-600">
                設定してすぐに開始
              </p>
            </div>
            <Link 
              href="/cpu/settings" 
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              はじめる
            </Link>
          </div>

          {/* オンライン対戦 */}
          <div className="flex items-center justify-between p-6 bg-gray-50 rounded-lg border border-gray-200 opacity-60">
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">
                オンライン対戦
              </h2>
              <p className="text-gray-600">
                4人固定・10秒固定・近日公開
              </p>
            </div>
            <button 
              disabled 
              className="px-6 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed"
            >
              近日公開
            </button>
          </div>

          {/* フレンド対戦 */}
          <div className="flex items-center justify-between p-6 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">
                フレンド対戦
              </h2>
              <p className="text-gray-600">
                フレンドを招待して対戦
              </p>
            </div>
            <Link 
              href="/friend" 
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              はじめる
            </Link>
          </div>
        </div>

        {/* 下部リンク */}
        <div className="text-center mt-12 space-x-6">
          <Link href="/rules" className="text-blue-600 hover:text-blue-800">
            ルール
          </Link>
          <button className="text-blue-600 hover:text-blue-800">
            言語切替
          </button>
        </div>
      </div>
    </main>
  );
}
