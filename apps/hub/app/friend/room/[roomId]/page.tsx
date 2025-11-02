"use client";

import { FriendRoomLayout, PlayerSeatGrid, RoomActionBar, RoomSummaryCard } from "@/components/ui";
import { getNickname } from "@/lib/profile";
import { makeClient } from "@/lib/realtime-client";
import { getRoom as getLocalRoom } from "@/lib/roomSystemUnified";
import { USE_SERVER_SYNC } from "@/lib/serverSync";
import { Room } from "@/types/room";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RoomWaitingPage() {
  // 共有ストアがある場合のみサーバ同期
  const useServer = USE_SERVER_SYNC;
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
    setMounted(true);

    const currentNickname = getNickname();
    if (!currentNickname) {
      router.push(`/setup?returnTo=/friend/room/${roomId}`);
      return;
    }

    setNickname(currentNickname);

        const fetchRoom = async (retryCount = 0) => {
          try {
            if (!useServer) {
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

        const pollInterval: ReturnType<typeof setInterval> | undefined = useServer
          ? setInterval(fetchRoom, isMobile ? 2000 : 3000) // スマホではより短い間隔でポーリング
          : undefined;

        // デバッグ用: サーバーメモリの状況を確認
        if (useServer) {
          fetchRoom().then(() => {
            console.log('[RoomPage] Initial fetch completed');
          });
        }

        // Ablyクライアントでリアルタイム更新を受信
        if (useServer && currentNickname) {
          try {
            console.log(`[RoomPage] Initializing Ably client for room: ${roomId}, user: ${currentNickname}, mobile: ${isMobile}`);

            const ablyClient = makeClient(currentNickname, `room-${roomId}`);
            const channel = ablyClient.channels.get(`room-${roomId}`);

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
      if (pollInterval) clearInterval(pollInterval);
      // Ablyクライアントのクリーンアップは自動的に行われる
    };
  }, [roomId, router, useServer]);
  // SSR/初期ハイドレーション差異を避けるため、マウント完了まで静的なスケルトンのみ表示
  if (!mounted) {
    return (
      <FriendRoomLayout title="フレンドルーム" eyebrow={`ROOM ${roomId}`}>
        <div className="friend-room__status-card text-center">読み込み中…</div>
      </FriendRoomLayout>
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
    <FriendRoomLayout title="フレンドルーム" eyebrow={`ROOM ${roomId}`}>
      <div className="friend-room__status-card text-center flex flex-col gap-4">
        <p>{message}</p>
        {actions}
      </div>
    </FriendRoomLayout>
  );

  if (error) {
    return renderStatusCard(
      error,
      <div className="friend-room__status-actions">
        <Link href="/home" className="fc-button fc-button--primary friend-room__cta-button">
          ホームに戻る
        </Link>
        <Link href="/friend" className="fc-button fc-button--secondary friend-room__cta-button">
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
    <FriendRoomLayout
      title="フレンドルーム待機中"
      eyebrow={`ROOM ${roomId}`}
      badge={{ label: "ROOM", value: roomId }}
      footer={
        <RoomActionBar
          secondary={
            isInRoom ? (
              <button
                type="button"
                onClick={handleLeaveRoom}
                className="fc-button fc-button--secondary friend-room__cta-button"
              >
                ルームを退出する
              </button>
            ) : null
          }
          primary={
            isHost && isFull && room.status === 'waiting' ? (
              <button
                type="button"
                onClick={handleStartGame}
                className="fc-button fc-button--primary friend-room__cta-button"
              >
                ゲームを開始する
              </button>
            ) : null
          }
          hint={!isFull && isHost ? '参加者が揃ったら「ゲームを開始する」を押してください' : undefined}
        />
      }
    >
      <RoomSummaryCard
        roomCode={roomId}
        status={room.status === 'waiting' ? 'waiting' : room.status === 'playing' ? 'playing' : 'finished'}
        requiredPlayers={room.size}
        joinedPlayers={filledSeats}
        limitSeconds={room.turnSeconds}
        maxCucumbers={room.maxCucumbers}
        headerActions={
          <>
            <button
              type="button"
              onClick={handleCopyRoomId}
              className="fc-button fc-button--secondary"
            >
              {copied ? 'コピーしました！' : 'ルーム番号をコピー'}
            </button>
            <Link href="/rules" className="fc-button fc-button--secondary">ルール</Link>
            <Link href="/home" className="fc-button fc-button--secondary">ホーム</Link>
          </>
        }
      >
        <div>
          <h2 className="font-heading text-[clamp(18px,2.6vw,24px)]" style={{color: 'var(--antique-ink)'}}>参加者一覧 ({filledSeats}/{room.size})</h2>
          <PlayerSeatGrid
            seats={room.seats.map((seat, index) => ({
              nickname: seat?.nickname ?? null,
              isHost: index === 0 && !!seat,
              isYou: seat?.nickname === nickname,
            }))}
          />
        </div>
      </RoomSummaryCard>
    </FriendRoomLayout>
  );
}
