'use client';

import { getRoom, leaveRoom, updateRoomStatus } from "@/lib/roomSystem";
import { Room } from "@/types/room";
import { getNickname } from "@/utils/user";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RoomWaitingPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [isInRoom, setIsInRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `ルーム ${roomId} | Five Cucumber`;
    
    const currentNickname = getNickname();
    if (!currentNickname) {
      router.push(`/setup?returnTo=/friend/room/${roomId}`);
      return;
    }
    
    setNickname(currentNickname);
    
    // ルーム情報を取得
    const roomData = getRoom(roomId);
    if (!roomData) {
      setError('ルームが見つかりません');
      return;
    }
    
    setRoom(roomData);
    
    // 現在のユーザーがルームにいるかチェック
    const isParticipating = roomData.seats.some(seat => seat?.nickname === currentNickname);
    setIsInRoom(isParticipating);
  }, [roomId, router]);

  const handleLeaveRoom = () => {
    if (!nickname || !room) return;
    
    if (leaveRoom(roomId, nickname)) {
      // ルーム情報を更新
      const updatedRoom = getRoom(roomId);
      if (updatedRoom) {
        setRoom(updatedRoom);
        setIsInRoom(false);
      }
    }
  };

  const handleStartGame = () => {
    if (!room || !nickname) return;
    
    // 満員かチェック
    const filledSeats = room.seats.filter(seat => seat !== null).length;
    if (filledSeats !== room.size) {
      setError('全員が揃っていません');
      return;
    }
    
    // ホスト（seats[0]）のみがゲーム開始可能
    const isHost = room.seats[0]?.nickname === nickname;
    if (!isHost) {
      setError('ホストのみがゲーム開始できます');
      return;
    }
    
    // ルームステータスを「対戦中」に変更
    updateRoomStatus(roomId, 'playing');
    
    // ゲーム画面に遷移
    router.push(`/friend/play/${roomId}`);
  };

  if (error) {
    return (
      <main className="page-home min-h-screen w-full pt-20">
        <div className="container mx-auto px-4 text-center">
          <div className="bg-red-100 border border-red-300 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-600 font-semibold">{error}</p>
            <Link 
              href="/friend/join"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!room || !nickname) {
    return (
      <main className="page-home min-h-screen w-full pt-20">
        <div className="container mx-auto px-4 text-center">
          <p>読み込み中...</p>
        </div>
      </main>
    );
  }

  const filledSeats = room.seats.filter(seat => seat !== null).length;
  const isHost = room.seats[0]?.nickname === nickname;
  const isFull = filledSeats === room.size;

  return (
    <main className="page-home min-h-screen w-full pt-20">
      <div className="container mx-auto px-4">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">ルーム {roomId}</h1>
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
              <h2 className="text-xl font-semibold mb-4">ルーム情報</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="font-medium">定員: {room.size}人</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    room.status === 'waiting' ? 'bg-green-100 text-green-800' :
                    room.status === 'playing' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {room.status === 'waiting' ? '待機中' :
                     room.status === 'playing' ? '対戦中' : '終了'}
                  </span>
                </div>
              </div>
            </div>

            {/* 参加者一覧 */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">
                参加者 ({filledSeats}/{room.size})
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {room.seats.map((seat, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-md border ${
                      seat !== null
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {seat ? seat.nickname : '空き'}
                      </span>
                      {index === 0 && seat && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          ★ホスト
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* アクションボタン */}
            <div className="space-y-4">
              {isInRoom && (
                <button
                  onClick={handleLeaveRoom}
                  className="w-full py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  退出
                </button>
              )}

              {isHost && isFull && room.status === 'waiting' && (
                <button
                  onClick={handleStartGame}
                  className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  ゲーム開始
                </button>
              )}

              {!isFull && (
                <p className="text-center text-gray-600">
                  {room.size - filledSeats}人の参加を待っています...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

