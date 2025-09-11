'use client';

import { useRequireNickname } from "@/hooks/useRequireNickname";
import { validateRoomCode } from "@/lib/roomMock";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function FriendJoinPage() {
  const router = useRouter();
  // ニックネーム未設定時は必須表示
  useRequireNickname({ mode: 'require' });
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'ルーム参加 | Five Cucumber';
  }, []);

  const handleJoinRoom = () => {
    if (!roomCode.trim()) {
      setError('ルーム番号を入力してください');
      return;
    }

    if (validateRoomCode(roomCode)) {
      router.push(`/room/${roomCode}`);
    } else {
      setError('ルーム番号が違います');
    }
  };

  return (
    <main className="min-h-screen w-full pt-20">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-8">ルーム参加</h1>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md mx-auto">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">ルーム番号</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value);
                    setError(null);
                  }}
                  placeholder="5桁のルーム番号を入力"
                  maxLength={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {error && (
                  <p className="text-red-600 text-sm mt-2">{error}</p>
                )}
              </div>

              <button
                onClick={handleJoinRoom}
                className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                参加する
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
