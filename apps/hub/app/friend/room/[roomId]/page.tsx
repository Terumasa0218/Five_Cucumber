'use client';

import { getNickname } from "@/lib/profile";
import { getRoom as getLocalRoom } from "@/lib/roomSystemUnified";
import { Room } from "@/types/room";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { makeClient } from "@/lib/realtime-client";

export default function RoomWaitingPage() {
  // 常にサーバーAPIを使い、失敗時のみローカルにフォールバック
  const HAS_SERVER = true;
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [isInRoom, setIsInRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    document.title = `ルーム ${roomId} | Five Cucumber`;
    document.body.setAttribute('data-bg', 'home');
    setMounted(true);

    const currentNickname = getNickname();
    if (!currentNickname) {
      router.push(`/setup?returnTo=/friend/room/${roomId}`);
      return;
    }

    setNickname(currentNickname);

        const fetchRoom = async (retryCount = 0) => {
          try {
            if (!HAS_SERVER) {
              const local = getLocalRoom(roomId);
              if (local) {
                setRoom(local);
                const isParticipatingLocal = local.seats.some(seat => seat?.nickname === currentNickname);
                setIsInRoom(isParticipatingLocal);
                setError(null);
              } else {
                setError('ルームが見つかりません。');
              }
              setIsLoading(false);
              return;
            }

            // スマホでのネットワーク遅延を考慮してタイムアウトを設定
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

            const res = await fetch(`/api/friend/room/${roomId}`, {
              signal: controller.signal,
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
              if (res.status === 404) {
                const local = getLocalRoom(roomId);
                if (local) {
                  setRoom(local);
                  const isParticipatingLocal = local.seats.some(seat => seat?.nickname === currentNickname);
                  setIsInRoom(isParticipatingLocal);
                  setError(null);
                  setIsLoading(false);
                  return;
                }
                setError('ルームが見つかりません。ルームが削除されたか、ルーム番号が間違っている可能性があります。');
              } else {
                setError('ルーム情報の取得に失敗しました');
              }
              setIsLoading(false);
              return;
            }

            const data: { ok: boolean; room?: Room } = await res.json();
            if (data.ok && data.room) {
              setRoom(data.room);

              const isParticipating = data.room.seats.some(seat => seat?.nickname === currentNickname);
              setIsInRoom(isParticipating);
              setError(null);

              if (isParticipating && data.room.status === 'playing') {
                router.push(`/friend/play/${roomId}`);
                return;
              }
            } else {
              setError('ルーム情報の取得に失敗しました');
            }
          } catch (err) {
            console.error('Room fetch error:', err);
            if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
              setError('リクエストがタイムアウトしました。ネットワーク状況を確認してください。');
            } else {
              setError('ネットワークエラーが発生しました');
            }

            // スマホでのネットワーク不安定さを考慮してリトライ
            if (retryCount < 2) {
              console.log(`Room fetch retry ${retryCount + 1}/2`);
              setTimeout(() => fetchRoom(retryCount + 1), 1000);
              return;
            }
          } finally {
            setIsLoading(false);
          }
        };

    fetchRoom();

        // スマホ対応: User-Agentを確認
        const userAgent = navigator.userAgent;
        const isMobile = /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile/.test(userAgent);
        console.log('[RoomPage] User agent:', userAgent, 'Mobile:', isMobile);

        const pollInterval: ReturnType<typeof setInterval> | undefined = HAS_SERVER
          ? setInterval(fetchRoom, isMobile ? 2000 : 3000) // スマホではより短い間隔でポーリング
          : undefined;

        // デバッグ用: サーバーメモリの状況を確認
        if (HAS_SERVER) {
          fetchRoom().then(() => {
            console.log('[RoomPage] Initial fetch completed');
          });
        }

        // Ablyクライアントでリアルタイム更新を受信
        if (HAS_SERVER && currentNickname) {
          try {
            console.log(`[RoomPage] Initializing Ably client for room: ${roomId}, user: ${currentNickname}, mobile: ${isMobile}`);

            const ablyClient = makeClient(currentNickname, `room-${roomId}`);
            const channel = ablyClient.channels.get(`room-${roomId}-u-${currentNickname}`);

            // スマホ対応: チャネル状態を監視
            channel.on('attaching', () => {
              console.log('[RoomPage] Ably channel attaching...');
            });

            channel.on('attached', () => {
              console.log('[RoomPage] Ably channel attached successfully');
            });

            channel.on('failed', (stateChange) => {
              console.error('[RoomPage] Ably channel failed:', stateChange.reason);
              // スマホではAblyが失敗しやすいので、警告を表示
              if (isMobile) {
                console.warn('[RoomPage] Ably failed on mobile - relying on polling fallback');
              }
            });

            channel.subscribe('room_updated', (message) => {
              console.log('[RoomPage] Received room_updated event:', message.data);
              const { room: updatedRoom, event, joinedPlayer } = message.data;

              if (updatedRoom) {
                console.log('[RoomPage] Updating room state with new data:', updatedRoom);
                setRoom(updatedRoom);

                const isParticipating = updatedRoom.seats.some((seat: any) => seat?.nickname === currentNickname);
                setIsInRoom(isParticipating);

                if (event === 'player_joined' && joinedPlayer) {
                  console.log(`[RoomPage] Player ${joinedPlayer} joined the room`);
                  // スマホでは通知を表示してユーザーに知らせる
                  if (isMobile && 'Notification' in window && Notification.permission === 'granted') {
                    new Notification('Five Cucumber', {
                      body: `${joinedPlayer}さんがルームに参加しました`
                    });
                  }
                }
              }
            });

            console.log(`[RoomPage] Subscribed to room updates for room: ${roomId}, user: ${currentNickname}`);

          } catch (error) {
            console.error('[RoomPage] Failed to initialize Ably client:', error);
            // スマホではAblyが失敗しやすいので、警告を表示
            if (isMobile) {
              console.warn('[RoomPage] Ably initialization failed on mobile - relying on polling fallback');
            }
          }
        }

    return () => {
      document.body.removeAttribute('data-bg');
      if (pollInterval) clearInterval(pollInterval);
      // Ablyクライアントのクリーンアップは自動的に行われる
    };
  }, [roomId, router, HAS_SERVER]);
  // SSR/初期ハイドレーション差異を避けるため、マウント完了まで静的なスケルトンのみ表示
  if (!mounted) {
    return (
      <main className="friend-room-page">
        <div className="friend-room-page__background" aria-hidden="true" />
        <div className="friend-room-page__container">
          <section className="friend-room-page__content">
            <div className="friend-room-card friend-room-card--message">
              <p className="friend-room-card__message">読み込み中…</p>
            </div>
          </section>
        </div>
      </main>
    );
  }


  const handleLeaveRoom = async () => {
    if (!nickname || !room) return;
    try {
      const res = await fetch('/api/friend/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, nickname })
      });
      if (!res.ok) {
        console.warn('Leave room failed with status', res.status);
      }
    } catch (err) {
      console.error('Leave room error:', err);
    } finally {
      router.push('/home');
    }
  };

  const handleStartGame = async () => {
    if (!room || !nickname) return;
    const filledSeats = room.seats.filter(seat => seat !== null).length;
    if (filledSeats !== room.size) {
      setError('全員が揃っていません');
      return;
    }
    const isHost = room.seats[0]?.nickname === nickname;
    if (!isHost) {
      setError('ホストのみがゲーム開始できます');
      return;
    }
    try {
      const res = await fetch('/api/friend/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, status: 'playing' })
      });
      if (!res.ok) {
        try {
          const { updateRoomStatus, getRoom, upsertLocalRoom } = await import('@/lib/roomSystemUnified');
          updateRoomStatus(roomId, 'playing');
          const local = getRoom(roomId);
          if (local) {
            const updatedRoom: Room = { ...local, status: 'playing' };
            upsertLocalRoom(updatedRoom);
          }
        } catch {}
      }
      router.push(`/friend/play/${roomId}`);
    } catch (err) {
      console.error('Start game error, fallback to local:', err);
      try {
        const { updateRoomStatus, getRoom, upsertLocalRoom } = await import('@/lib/roomSystemUnified');
        updateRoomStatus(roomId, 'playing');
        const local = getRoom(roomId);
        if (local) {
          const updatedRoom: Room = { ...local, status: 'playing' };
          upsertLocalRoom(updatedRoom);
        }
      } catch {}
      router.push(`/friend/play/${roomId}`);
    }
  };

  const handleCopyRoomId = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy room id failed:', err);
    }
  };

  const renderStatusCard = (message: string, actions?: React.ReactNode) => (
    <main className="friend-room-page">
      <div className="friend-room-page__background" aria-hidden="true" />
      <div className="friend-room-page__container">
        <section className="friend-room-page__content">
          <div className="friend-room-card friend-room-card--message">
            <p className="friend-room-card__message">{message}</p>
            {actions}
          </div>
        </section>
      </div>
    </main>
  );

  if (error) {
    return renderStatusCard(
      error,
      <div className="friend-room-card__actions">
        <Link href="/home" className="friend-room-card__submit">
          ホームに戻る
        </Link>
        <Link href="/friend" className="friend-room-card__link">
          フレンド対戦トップへ
        </Link>
      </div>
    );
  }

  if (isLoading || !room || !nickname) {
    return renderStatusCard(isLoading ? 'ルーム情報を読み込んでいます…' : 'ルーム情報を取得中です…');
  }

  const filledSeats = room.seats.filter(seat => seat !== null).length;
  const isHost = room.seats[0]?.nickname === nickname;
  const isFull = filledSeats === room.size;

  return (
    <main className="friend-room-page">
      <div className="friend-room-page__background" aria-hidden="true" />
      <div className="friend-room-page__container">
        <header className="friend-room-page__header friend-room-page__header--with-actions">
          <div>
            <p className="friend-room-page__eyebrow">ROOM {roomId}</p>
            <h1 className="friend-room-page__title">フレンドルーム待機中</h1>
            <p className="friend-room-page__lead">
              全員が揃ったらホストがゲームを開始してください。参加者はこのページで準備状況を確認できます。
            </p>
          </div>
          <div className="friend-room-page__header-actions">
            <button type="button" onClick={handleCopyRoomId} className="friend-room-page__chip">
              {copied ? 'コピーしました！' : 'ルーム番号をコピー'}
            </button>
            <Link href="/rules" className="friend-room-page__chip">ルール</Link>
            <Link href="/home" className="friend-room-page__chip friend-room-page__chip--accent">ホーム</Link>
          </div>
        </header>

        <section className="friend-room-page__content">
          <div className="friend-room-card friend-room-card--status">
            {room.status === 'playing' ? (
              <div className="friend-room-banner friend-room-banner--info">
                <span aria-hidden="true">🎮</span>
                <div>
                  <p className="friend-room-banner__title">現在対戦中です</p>
                  <p className="friend-room-banner__text">対戦終了まで新規参加はできません</p>
                </div>
              </div>
            ) : (
              <div className="friend-room-banner friend-room-banner--waiting">
                <span aria-hidden="true">⏳</span>
                <div>
                  <p className="friend-room-banner__title">参加者を待機中…</p>
                  <p className="friend-room-banner__text">{room.size - filledSeats}人の参加を待っています</p>
                </div>
              </div>
            )}

            <div className="friend-room-card__badge" aria-live="polite">
              <span>ROOM CODE</span>
              <strong>{roomId}</strong>
            </div>

            <div className="friend-room-card__section friend-room-card__section--grid">
              <div className="friend-room-info-row">
                <span>定員</span>
                <strong>{room.size}人</strong>
              </div>
              <div className="friend-room-info-row">
                <span>制限時間</span>
                <strong>{room.turnSeconds === 0 ? '無制限' : `${room.turnSeconds}秒`}</strong>
              </div>
              <div className="friend-room-info-row">
                <span>きゅうり上限</span>
                <strong>{room.maxCucumbers}本</strong>
              </div>
              <div className="friend-room-info-row">
                <span>ステータス</span>
                <strong>
                  {room.status === 'waiting' ? '待機中' : room.status === 'playing' ? '対戦中' : '終了'}
                </strong>
              </div>
            </div>

            <div className="friend-room-card__section">
              <h2 className="friend-room-card__heading">参加者一覧 ({filledSeats}/{room.size})</h2>
              <div className="friend-room-seat-grid">
                {room.seats.map((seat, index) => (
                  <div
                    key={index}
                    className={`friend-room-seat ${seat ? 'friend-room-seat--occupied' : 'friend-room-seat--empty'}`}
                  >
                    <div className="friend-room-seat__title">
                      <span>{seat ? seat.nickname : '空き'}</span>
                      {index === 0 && seat && (
                        <span className="friend-room-seat__badge">ホスト</span>
                      )}
                      {seat?.nickname === nickname && (
                        <span className="friend-room-seat__badge friend-room-seat__badge--me">あなた</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="friend-room-card__actions friend-room-card__actions--wide">
              {isInRoom && (
                <button
                  onClick={handleLeaveRoom}
                  className="friend-room-card__secondary"
                >
                  ルームを退出する
                </button>
              )}

              {isHost && isFull && room.status === 'waiting' && (
                <button
                  onClick={handleStartGame}
                  className="friend-room-card__submit"
                >
                  ゲームを開始する
                </button>
              )}

              {!isFull && isHost && (
                <p className="friend-room-card__hint" role="status">
                  参加者が揃ったら「ゲームを開始する」を押してください
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
