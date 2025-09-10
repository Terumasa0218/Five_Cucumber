'use client';

import PlayerSetupModal from "@/components/PlayerSetupModal";
import { useRequireNickname } from "@/hooks/useRequireNickname";
import { getProfile } from "@/lib/profile";
import { addParticipant, getRoom, removeParticipant, type Room } from "@/lib/roomMock";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { showModal, handleProfileSaved } = useRequireNickname();
  const roomCode = params.code as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [isParticipating, setIsParticipating] = useState(false);

  useEffect(() => {
    document.title = `ルーム ${roomCode} | Five Cucumber`;
    
    const roomData = getRoom(roomCode);
    if (!roomData) {
      router.push('/friend/join');
      return;
    }
    
    setRoom(roomData);
    
    // 現在のユーザーが参加しているかチェック
    const profile = getProfile();
    if (profile?.nickname && roomData.participants.includes(profile.nickname)) {
      setIsParticipating(true);
    }
  }, [roomCode, router]);

  const handleJoin = () => {
    const profile = getProfile();
    if (!profile?.nickname) return;
    
    if (addParticipant(roomCode, profile.nickname)) {
      setRoom(prev => prev ? { ...prev, participants: [...prev.participants, profile.nickname] } : null);
      setIsParticipating(true);
    }
  };

  const handleLeave = () => {
    const profile = getProfile();
    if (!profile?.nickname) return;
    
    if (removeParticipant(roomCode, profile.nickname)) {
      setRoom(prev => prev ? { ...prev, participants: prev.participants.filter(p => p !== profile.nickname) } : null);
      setIsParticipating(false);
    }
  };

  const handleStartGame = () => {
    if (room && room.participants.length === room.size) {
      // ダミー対戦開始
      alert('対戦開始！');
      // 実際の実装ではゲーム画面に遷移
      setTimeout(() => {
        router.push('/friend');
      }, 2000);
    }
  };

  if (!room) {
    return (
      <main className="min-h-screen w-full pt-20">
        <div className="container mx-auto px-4 text-center">
          <p>ルームが見つかりません</p>
        </div>
      </main>
    );
  }

  const isFull = room.participants.length === room.size;

  return (
    <main className="min-h-screen w-full pt-20">
      <div className="container mx-auto px-4">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">ルーム {roomCode}</h1>
          <div className="space-x-2">
            <Link 
              href="/rules" 
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              ルール
            </Link>
            <Link 
              href="/home" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              ホーム
            </Link>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* ルーム情報 */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">ルーム設定</h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="font-medium">人数</div>
                  <div>{room.size}人</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="font-medium">きゅうり数</div>
                  <div>{room.cucumber}本</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="font-medium">制限時間</div>
                  <div>{room.limit}秒</div>
                </div>
              </div>
            </div>

            {/* 参加者 */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">参加者 ({room.participants.length}/{room.size})</h2>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: room.size }, (_, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-md border ${
                      i < room.participants.length
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {i < room.participants.length ? room.participants[i] : '空き'}
                  </div>
                ))}
              </div>
            </div>

            {/* アクションボタン */}
            <div className="space-y-4">
              {!isParticipating ? (
                <button
                  onClick={handleJoin}
                  disabled={isFull}
                  className={`w-full py-3 rounded-md font-semibold transition-colors ${
                    isFull
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isFull ? '満員' : '＋参加'}
                </button>
              ) : (
                <button
                  onClick={handleLeave}
                  className="w-full py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  －退出
                </button>
              )}

              {isFull && (
                <button
                  onClick={handleStartGame}
                  className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  対戦開始
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ニックネーム未設定時はこのページ上でモーダル表示 */}
      <PlayerSetupModal
        isOpen={showModal}
        onClose={() => {}}
        onProfileSaved={handleProfileSaved}
      />
    </main>
  );
}
