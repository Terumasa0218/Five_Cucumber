"use client";

import { FriendRoomLayout, PlayerSeatGrid, RoomActionBar, RoomSummaryCard } from "@/components/ui";
import { apiJson, apiRequest, ApiRequestError } from "@/lib/api";
import { friendAuthFailureMessage, friendClientAuthFailureMessage } from "@/lib/friendApiErrors";
import { getNickname } from "@/lib/profile";
import { normalizeRoomId } from "@/lib/friend-room";
import { getRoom as getLocalRoom } from "@/lib/roomSystemUnified";
import { USE_SERVER_SYNC } from "@/lib/serverSync";
import type { Room, RoomResponse } from "@/types/room";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Types } from "ably";

export default function RoomWaitingPage() {
  // 共有ストアがある場合のみサーバ同期
  const useServer = USE_SERVER_SYNC;
  const params = useParams();
  const router = useRouter();
  const roomId = normalizeRoomId(params.roomId);
  const [room, setRoom] = useState<Room | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [isInRoom, setIsInRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const debugRooms = process.env.NEXT_PUBLIC_DEBUG_ROOMS === '1';
  const debugLog = (...args: unknown[]) => {
    if (debugRooms) console.log(...args);
  };
  const debugWarn = (...args: unknown[]) => {
    if (debugRooms) console.warn(...args);
  };

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
          let timeoutId: ReturnType<typeof setTimeout> | undefined;
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
            timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

            const response = await apiRequest<RoomResponse>(`/api/friend/room/${roomId}`, {
              signal: controller.signal,
              headers: {
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache'
              }
            });
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = undefined;
            }

            const data = response.data;
            if (data.ok && data.room) {
              setRoom(data.room);

              const isParticipating = data.room.seats.some((seat) => seat?.nickname === currentNickname);
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
            debugWarn('Room fetch error:', err);
            const clientAuthMessage = friendClientAuthFailureMessage(err);
            if (err instanceof DOMException && err.name === 'AbortError') {
              setError('リクエストがタイムアウトしました。ネットワーク状況を確認してください。');
            } else if (clientAuthMessage) {
              setError(clientAuthMessage);
            } else if (
              err instanceof ApiRequestError &&
              [401, 404, 503].includes(err.response.status)
            ) {
              const body = err.response.data as (RoomResponse & { error?: string }) | undefined;
              const authMessage = friendAuthFailureMessage(err.response.status, body);
              setError(
                authMessage ??
                (err.response.status === 404
                  ? 'ルームが見つかりません。ルームが削除されたか、ルーム番号が間違っている可能性があります。'
                  : 'サーバー同期の設定が不足しています。別端末とのフレンド対戦にはFirebase Adminと共有ストアの設定が必要です。')
              );
            } else {
              setError('ネットワークエラーが発生しました');
            }

            // スマホでのネットワーク不安定さを考慮してリトライ
            if (retryCount < 2) {
              debugLog(`Room fetch retry ${retryCount + 1}/2`);
              setTimeout(() => fetchRoom(retryCount + 1), 1000);
              return;
            }
          } finally {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            setIsLoading(false);
          }
        };

    fetchRoom();

        // スマホ対応: User-Agentを確認
        const userAgent = navigator.userAgent;
        const isMobile = /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile/.test(userAgent);
        debugLog('[RoomPage] User agent:', userAgent, 'Mobile:', isMobile);

        const pollInterval: ReturnType<typeof setInterval> | undefined = useServer
          ? setInterval(() => fetchRoom(), isMobile ? 2000 : 3000)
          : undefined;

        // デバッグ用: サーバーメモリの状況を確認
        if (useServer) {
          fetchRoom().then(() => {
            debugLog('[RoomPage] Initial fetch completed');
          });
        }

        // Ablyクライアントでリアルタイム更新を受信
        if (useServer && currentNickname) {
          (async () => {
            try {
              const [{ getClientAuthUid }, { makeClient }] = await Promise.all([
                import('@/lib/clientAuth'),
                import('@/lib/realtime-client'),
              ]);
              const authUid = await getClientAuthUid();
              const channelName = `room-${roomId}-user-${currentNickname}`;
              debugLog(`[RoomPage] Initializing Ably client for room: ${roomId}, user: ${currentNickname}, authUid: ${authUid}, mobile: ${isMobile}`);

              const ablyClient = makeClient(authUid, channelName);
              const channel = ablyClient.channels.get(channelName);

            // スマホ対応: チャネル状態を監視
            channel.on('attaching', () => {
              debugLog('[RoomPage] Ably channel attaching...');
            });

            channel.on('attached', () => {
              debugLog('[RoomPage] Ably channel attached successfully');
            });

            channel.on('failed', (stateChange: Types.ChannelStateChange) => {
              debugWarn('[RoomPage] Ably channel failed:', stateChange.reason);
              // スマホではAblyが失敗しやすいので、警告を表示
              if (isMobile) {
                debugWarn('[RoomPage] Ably failed on mobile - relying on polling fallback');
              }
            });

            channel.subscribe('room_updated', (message: Types.Message) => {
              debugLog('[RoomPage] Received room_updated event:', message.data);
              const { room: updatedRoom, event, joinedPlayer } = message.data;

              if (updatedRoom) {
                debugLog('[RoomPage] Updating room state with new data:', updatedRoom);
                setRoom(updatedRoom);

                const isParticipating = updatedRoom.seats.some((seat: Room['seats'][number]) => seat?.nickname === currentNickname);
                setIsInRoom(isParticipating);

                if (event === 'player_joined' && joinedPlayer) {
                  debugLog(`[RoomPage] Player ${joinedPlayer} joined the room`);
                  // スマホでは通知を表示してユーザーに知らせる
                  if (isMobile && 'Notification' in window && Notification.permission === 'granted') {
                    new Notification('Five Cucumber', {
                      body: `${joinedPlayer}さんがルームに参加しました`
                    });
                  }
                }
              }
            });

            debugLog(`[RoomPage] Subscribed to room updates for room: ${roomId}, user: ${currentNickname}`);

            } catch (error) {
              debugWarn('[RoomPage] Failed to initialize Ably client:', error);
              // スマホではAblyが失敗しやすいので、警告を表示
              if (isMobile) {
                debugWarn('[RoomPage] Ably initialization failed on mobile - relying on polling fallback');
              }
            }
          })();
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
      if (!useServer) {
        const { leaveRoom } = await import('@/lib/roomSystemUnified');
        leaveRoom(roomId, nickname);
        router.push('/home');
        return;
      }

      await apiJson<{ ok: boolean; reason?: string }>(`/api/friend/leave`, {
        method: 'POST',
        json: { roomId, nickname },
      });
    } catch (err) {
      debugWarn('Leave room error:', err);
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
      if (!useServer) {
        setError('このローカルルームは待機画面の確認用です。別端末のフレンド対戦を開始するにはサーバー同期設定が必要です。');
        return;
      }

      await apiJson<{ ok: boolean; reason?: string }>(`/api/friend/status`, {
        method: 'POST',
        json: { roomId, status: 'playing', nickname },
      });
      router.push(`/friend/play/${roomId}`);
    } catch (err) {
      debugWarn('Start game error:', err);
      setError(friendClientAuthFailureMessage(err) ?? 'ゲーム開始に失敗しました。認証、共有ストア、または参加者状態を確認してください。');
    }
  };

  const handleCopyRoomId = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      debugWarn('Copy room id failed:', err);
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
