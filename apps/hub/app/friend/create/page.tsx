'use client';

import { getNickname } from "@/utils/user";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function FriendCreatePage() {
  const router = useRouter();
  const [roomSize, setRoomSize] = useState(4);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ roomSize, nickname })
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
    <main className="page-home min-h-screen w-full pt-20">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-8">ルーム作成</h1>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md mx-auto">
            <div className="space-y-6">
              {/* 人数選択 */}
              <div>
                <label className="block text-sm font-medium mb-2">人数</label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4, 5, 6].map(num => (
                    <button
                      key={num}
                      onClick={() => setRoomSize(num)}
                      className={`opt ${roomSize === num ? 'selected' : ''}`}
                      aria-pressed={roomSize === num}
                      disabled={isCreating}
                    >
                      {num}人
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
      </div>
    </main>
  );
}
