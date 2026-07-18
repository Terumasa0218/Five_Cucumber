'use client';

import { apiJson, ApiRequestError } from "@/lib/api";
import { normalizeRoomId } from "@/lib/friend-room";
import { getNickname } from "@/lib/profile";
import { getRoom, joinRoom, upsertLocalRoom } from "@/lib/roomSystemUnified";
import { USE_SERVER_SYNC } from "@/lib/serverSync";
import type { Room, RoomResponse } from "@/types/room";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function FriendJoinPage() {
  const router = useRouter();
  const serverSyncEnabled = USE_SERVER_SYNC;
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    document.title = 'ルーム参加 | Five Cucumber';
  }, []);

  const joinFailureMessage = (reason?: string) => {
    switch (reason) {
      case 'not-found':
        return serverSyncEnabled
          ? 'ルーム番号が違います'
          : 'この端末にローカルルームが見つかりません。別端末の友達と遊ぶにはサーバー同期設定が必要です。';
      case 'full':
        return 'この部屋はすでに定員です';
      case 'locked':
      case 'busy':
        return '対戦中のため入室できません';
      case 'expired':
        return '部屋の有効期限が切れました';
      case 'bad-request':
        return 'ルーム番号の形式が正しくありません';
      case 'no-shared-store':
        return 'フレンド対戦のサーバー同期に必要な共有ストアが未設定です。ローカル確認ではサーバー同期をOFFにしてください。';
      default:
        return '参加に失敗しました';
    }
  };

  const backendFailureMessage = (err: unknown) => {
    if (err instanceof ApiRequestError) {
      const body = err.response.data as RoomResponse | { reason?: string } | undefined;
      if (err.response.status === 401) {
        return 'サーバー同期に必要な認証設定が不足しています。フレンド対戦を公開環境で使うにはFirebase Admin設定が必要です。';
      }
      return joinFailureMessage(body?.reason);
    }

    const message = err instanceof Error ? err.message : String(err);
    return `ネットワークエラーが発生しました${message ? ` (${message})` : ''}`;
  };

  const canFallbackToLocalJoin = (err: unknown) => {
    if (serverSyncEnabled) return false;
    if (!(err instanceof ApiRequestError)) return true;
    const body = err.response.data as RoomResponse | { reason?: string } | undefined;
    return (
      err.response.status === 0 ||
      err.response.status === 401 ||
      err.response.status === 503 ||
      body?.reason === 'no-shared-store'
    );
  };

  const joinLocalRoom = (trimmedRoomCode: string, nickname: string) => {
    const result = joinRoom(trimmedRoomCode, nickname);
    if (!result.success || !result.roomId) {
      setError(joinFailureMessage(result.reason));
      return;
    }

    const localRoom = getRoom(result.roomId);
    if (localRoom) {
      upsertLocalRoom(localRoom);
    }
    router.push(`/friend/room/${result.roomId}`);
  };

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

    const trimmedRoomCode = normalizeRoomId(roomCode);
    if (trimmedRoomCode.length !== 6) {
      setError('ルーム番号の形式が正しくありません');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      if (!serverSyncEnabled) {
        joinLocalRoom(trimmedRoomCode, nickname);
        return;
      }

      const data = await apiJson<RoomResponse>('/api/friend/join', {
        method: 'POST',
        json: { roomId: trimmedRoomCode, nickname },
      });
      if (data.ok && data.roomId) {
        try {
          if (data.room) {
            upsertLocalRoom(data.room);
          } else {
            // 追加取得で保存を試みる
            const rd = await apiJson<RoomResponse>(`/api/friend/room/${data.roomId}`);
            if (rd.ok && rd.room) {
              upsertLocalRoom(rd.room);
            } else {
              const fallbackRoom: Room = {
                id: data.roomId,
                size: 2,
                seats: [null, { nickname }],
                status: 'waiting',
                createdAt: Date.now(),
                turnSeconds: 15,
                maxCucumbers: 5,
              };
              upsertLocalRoom(fallbackRoom);
            }
          }
        } catch {}
        router.push(`/friend/room/${data.roomId}`);
      } else {
        setError(joinFailureMessage(data.reason));
      }
    } catch (err) {
      if (canFallbackToLocalJoin(err)) {
        joinLocalRoom(trimmedRoomCode, nickname);
        return;
      }
      setError(backendFailureMessage(err));
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
