'use client';

import PlayerSetupModal from "@/components/PlayerSetupModal";
import { useRequireNickname } from "@/hooks/useRequireNickname";
import Link from "next/link";
import { useEffect } from "react";

export default function FriendPage() {
  const { showModal, handleProfileSaved } = useRequireNickname();

  useEffect(() => {
    document.title = 'フレンド対戦 | Five Cucumber';
  }, []);

  return (
    <main className="min-h-screen w-full pt-20">
      <div className="container mx-auto px-4">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">フレンド対戦</h1>
          <Link 
            href="/rules" 
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            ルール
          </Link>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">フレンド対戦</h2>
              <p className="text-gray-600 mb-6">
                ルームを作成するか、既存のルームに参加してください
              </p>
            </div>

            <div className="space-y-4">
              <Link
                href="/friend/create"
                className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-center block"
              >
                ルーム作成
              </Link>

              <Link
                href="/friend/join"
                className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-center block"
              >
                ルーム参加
              </Link>
            </div>
          </div>
        </div>
      </div>

      <PlayerSetupModal
        isOpen={showModal}
        onClose={() => {}}
        onProfileSaved={handleProfileSaved}
      />
    </main>
  );
}
