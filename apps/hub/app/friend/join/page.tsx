'use client';

import { getNickname } from "@/lib/profile";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function FriendJoinPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    document.title = 'ルーム参加 | Five Cucumber';
  }, []);

  const handleJoinRoom = async () => {
    const nickname = getNickname();
    if (!nickname) {
      router.push('/setup?returnTo=/friend/join');
      return;
    }

    if (!roomCode.trim()) {
      setError('ルーム番号を入力してください');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const res = await fetch('/api/friend/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: roomCode.trim(), nickname })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.roomId) {
          router.push(`/friend/room/${data.roomId}`);
        } else {
          setError('参加に失敗しました');
        }
      } else {
        switch (res.status) {
          case 404:
            setError('ルーム番号が違います');
            break;
          case 409:
            setError('部屋が満員です');
            break;
          case 410:
            setError('部屋の有効期限が切れました');
            break;
          case 423:
            setError('対戦中のため入室できません');
            break;
          default:
            setError('参加に失敗しました');
            break;
        }
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main className="page-home min-h-screen w-full pt-20 relative">
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-8 text-white drop-shadow-lg">ルーム参加</h1>
          
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
                  placeholder="6桁のルーム番号を入力"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {error && (
                  <p className="text-red-600 text-sm mt-2">{error}</p>
                )}
              </div>

              <button
                onClick={handleJoinRoom}
                disabled={isJoining}
                className={`w-full py-3 rounded-md font-semibold transition-colors ${
                  isJoining
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isJoining ? '参加中...' : '参加する'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
