'use client';

import { useRequireNickname } from "@/hooks/useRequireNickname";
import { useEffect } from "react";

export default function OnlinePage() {
  // ニックネーム未設定時は必須表示
  useRequireNickname({ mode: 'require' });

  useEffect(() => {
    document.title = 'オンライン対戦 | Five Cucumber';
  }, []);

  return (
    <main className="min-h-screen w-full pt-20">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-8">オンライン対戦</h1>
          
          <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">近日公開</h2>
              <p className="text-gray-600 mb-4">
                オンライン対戦機能は準備中です
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-semibold mb-2">予定仕様</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>• 4人固定</div>
                  <div>• 制限時間: 10秒固定</div>
                  <div>• ランダムマッチング</div>
                </div>
              </div>

              <button
                disabled
                className="w-full py-3 bg-gray-400 text-white rounded-md cursor-not-allowed"
              >
                近日公開
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
