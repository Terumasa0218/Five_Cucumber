'use client';

import { getNickname } from "@/lib/profile";
import { upsertLocalRoom } from "@/lib/roomSystemUnified";
import type { Room } from "@/types/room";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api";

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
      const data = await apiJson<any>('/friend/join', { method: 'POST', json: { roomId: roomCode.trim(), nickname } });
      if (data.ok && data.roomId) {
        try {
          if (data.room) {
            upsertLocalRoom(data.room as Room);
          } else {
            // 追加取得で保存を試みる
            const rd = await apiJson<any>(`/friend/room/${data.roomId}`);
            if (rd.ok && rd.room) {
              upsertLocalRoom(rd.room as Room);
            } else {
              const fallbackRoom: Room = {
                id: data.roomId,
                size: 2,
                seats: [null, { nickname }],
                status: 'waiting',
                createdAt: Date.now(),
                turnSeconds: 15,
                maxCucumbers: 5
              };
              upsertLocalRoom(fallbackRoom);
            }
          }
        } catch {}
        router.push(`/friend/room/${data.roomId}`);
      } else {
        const status = Number(String(data?.message).match(/\s(\d{3})\s/)?.[1] || 500);
        switch (status) {
          case 404:
            setError('ルーム番号が違います');
            break;
          case 409:
            setError('この部屋はすでに定員です');
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
    <main className="friend-room-page">
      <div className="friend-room-page__background" aria-hidden="true" />
      <div className="friend-room-page__container">
        <header className="friend-room-page__header">
          <p className="friend-room-page__eyebrow">JOIN ROOM</p>
          <h1 className="friend-room-page__title">ルーム番号で参加する</h1>
          <p className="friend-room-page__lead">
            ホストから共有された6桁のルーム番号を入力して、待機中のフレンド対戦に参加しましょう。
          </p>
        </header>

        <section className="friend-room-page__content">
          <div className="friend-room-card friend-room-card--form">
            <div className="friend-room-card__form-group">
              <label className="friend-room-card__heading" htmlFor="room-code">ルーム番号</label>
              <input
                id="room-code"
                type="text"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.replace(/[^0-9]/g, ''));
                  setError(null);
                }}
                placeholder="6桁のルーム番号を入力"
                maxLength={6}
                className="friend-room-card__input"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              <p className="friend-room-card__hint">
                例) 123456
              </p>
              {error && (
                <p className="friend-room-card__error" role="alert">{error}</p>
              )}
            </div>

            <div className="friend-room-card__actions">
              <button
                onClick={handleJoinRoom}
                disabled={isJoining || roomCode.trim().length !== 6}
                className={`friend-room-card__submit ${isJoining || roomCode.trim().length !== 6 ? 'is-disabled' : ''}`}
              >
                {isJoining ? '参加中...' : 'ルームに参加する'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/friend')}
                className="friend-room-card__link"
              >
                フレンド対戦トップに戻る
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
