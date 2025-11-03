'use client';

import BattleLayout from '@/components/BattleLayout';
import { EllipseTable, Timer } from '@/components/ui';
import { apiJson, apiRequest, ApiRequestError } from '@/lib/api';
import {
    createInitialState,
    GameConfig,
    GameState,
    getEffectiveTurnSeconds,
    getLegalMoves,
    Move,
    SeededRng
} from '@/lib/game-core';
import { getNickname } from '@/lib/profile';
import { USE_SERVER_SYNC } from '@/lib/serverSync';
import { getRoom as getLocalRoom } from '@/lib/roomSystemUnified';
import type { GameSnapshot } from '@/lib/friendGameStore';
import type { Room, RoomResponse, RoomSeat } from '@/types/room';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import '../../../cucumber/cpu/play/game.css';

function FriendPlayContent() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [isCardLocked, setIsCardLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockedCardId, setLockedCardId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [cpuReplacedPlayers, setCpuReplacedPlayers] = useState<Set<number>>(new Set());
  const [disconnectStartTime, setDisconnectStartTime] = useState<number | null>(null);
  const [isGameInitialized, setIsGameInitialized] = useState(false);
  const [roomConfig, setRoomConfig] = useState<Room | null>(null);
  const useServer = USE_SERVER_SYNC;
  const [mySeatIndex, setMySeatIndex] = useState<number>(0);
  
  type PlayerController = { type: 'human'; name: string };

  const gameRef = useRef<{
    state: GameState;
    config: GameConfig;
    controllers: PlayerController[];
    rng: SeededRng;
  } | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastVersionRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  type FriendRoomInfo = { room: Room; playerIndex: number };
  type FriendGameResponse = { ok: true; snapshot: GameSnapshot } | { ok: false; reason: string };
  type UpdateStatusResponse = { ok: boolean; reason?: string };

  const resolvePlayerIndex = (seats: RoomSeat[], nickname: string | null): number => {
    if (!nickname) return -1;
    return seats.findIndex((seat) => seat?.nickname === nickname);
  };

  // ルーム情報を取得
  const fetchRoomConfig = async (): Promise<FriendRoomInfo | null> => {
    try {
      console.log('[Friend Game] Fetching room config for:', roomCode);
      const nickname = getNickname();

      if (!useServer) {
        const localRoom = getLocalRoom(roomCode);
        if (!localRoom) {
          throw new Error('Local room not found');
        }
        const playerIndex = resolvePlayerIndex(localRoom.seats, nickname);
        if (playerIndex < 0) {
          throw new Error(`Player ${nickname ?? 'unknown'} not found in local room ${roomCode}`);
        }
        setRoomConfig(localRoom);
        setMySeatIndex(playerIndex);
        return { room: localRoom, playerIndex };
      }

      const data = await apiJson<RoomResponse>(`/friend/room/${roomCode}`);

      if (!data.ok || !data.room) {
        throw new Error('Invalid room data received');
      }

      console.log('[Friend Game] Room data received:', data.room);

      setRoomConfig(data.room);

      const playerIndex = resolvePlayerIndex(data.room.seats, nickname);
      if (playerIndex < 0) {
        console.error('[Friend Game] Player not found in room seats:', data.room.seats);
        throw new Error(`Player ${nickname ?? 'unknown'} not found in room ${roomCode}`);
      }

      setMySeatIndex(playerIndex);

      return { room: data.room, playerIndex };
    } catch (error) {
      console.error('[Friend Game] Failed to fetch room config:', error);
      // エラー時はホームにリダイレクト
      router.push('/home');
      return null;
    }
  };

  // ゲーム開始
  const startGame = async () => {
    try {
      console.log('[Friend Game] Starting game initialization...');
      
      // まずルーム情報を取得
      const info = await fetchRoomConfig();
      if (!info) {
        console.error('[Friend Game] Cannot start game without room config');
        return;
      }
      const room = info.room;
      const myIndex = info.playerIndex;

      // ルームの状態をチェック（ホストは開始フラグを立て直す／ゲストは短時間待機）
      if (room.status !== 'playing') {
        if (myIndex === 0) {
          try {
            await apiJson<UpdateStatusResponse>('/friend/status', {
              method: 'POST',
              json: { roomId: roomCode, status: 'playing' },
            });
            room.status = 'playing';
          } catch (e) {
            console.warn('[Friend Game] Failed to set playing status, will continue as host:', e);
          }
        } else {
          // ゲストは最大5回リトライ（約2秒）
          let tries = 0;
          while (tries < 5) {
            await new Promise((resolve) => setTimeout(resolve, 400));
            try {
              const d = await apiJson<RoomResponse>(`/friend/room/${roomCode}`);
              if (d.ok && d.room?.status === 'playing') {
                room.status = 'playing';
                break;
              }
            } catch {
              // リトライ継続
            }
            tries++;
          }
          if (room.status !== 'playing') {
            console.error('[Friend Game] Room is not in playing status after wait:', room.status);
            router.push(`/friend/room/${roomCode}`);
            return;
          }
        }
      }

      // プレイヤーがルームに参加しているかチェック
      const nickname = getNickname();
      const isPlayerInRoom = room.seats.some((seat) => seat?.nickname === nickname);
      if (!isPlayerInRoom) {
        console.error('[Friend Game] Player not in room, redirecting to room page');
        router.push(`/friend/room/${roomCode}`);
        return;
      }

      const config: GameConfig = {
        players: room.size,
        turnSeconds: room.turnSeconds === 0 ? null : room.turnSeconds,
        maxCucumbers: room.maxCucumbers,
        initialCards: 7,
        seed: Number(room.seed ?? Date.now()),
        cpuLevel: 'normal'
      };
      
      const { SeededRng } = await import('@/lib/game-core');
      const controllers: PlayerController[] = Array.from({ length: room.size }, (_, idx) => ({
        type: 'human' as const,
        name: idx === myIndex ? 'あなた' : (room.seats[idx]?.nickname || `P${idx + 1}`)
      }));

      const isHost = myIndex === 0;
        if (isHost) {
        const rng = new SeededRng(config.seed);
        const state = createInitialState(config, rng);
        gameRef.current = { state, config, controllers, rng };
        setGameState(state);
        setGameOver(false);
        setIsGameInitialized(true);
        console.log(`[Friend Game] Host initialized local state and posting snapshot`);
        try {
          const data = await apiJson<FriendGameResponse>(`/friend/game/${roomCode}`, {
            method: 'POST',
            json: { type: 'init', state, config },
          });
          if (data.ok) {
            lastVersionRef.current = data.snapshot.version ?? 1;
          }
        } catch (initError) {
          console.warn('[Friend Game] Failed to persist snapshot:', initError);
        }
        } else {
          // 参加者はサーバーのスナップショットを取得するまで待機
          if (useServer) {
          try {
            const data = await apiJson<FriendGameResponse>(`/friend/game/${roomCode}`);
            if (data.ok) {
              const rng = new SeededRng(data.snapshot.config.seed);
              gameRef.current = { state: data.snapshot.state, config: data.snapshot.config, controllers, rng };
              setGameState(data.snapshot.state);
              setIsGameInitialized(true);
              lastVersionRef.current = data.snapshot.version ?? 1;
            }
          } catch {
            // リトライやフォールバックは後続処理に任せる
          }
        }
      }

      // ポーリングでサーバー権威の状態を反映
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      const poll = useServer ? setInterval(async () => {
        try {
          // スマホでのネットワーク遅延を考慮してタイムアウトを設定
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒タイムアウト

          const response = await apiRequest<FriendGameResponse>(`/friend/game/${roomCode}`, {
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
            parseAs: 'json',
          });
          clearTimeout(timeoutId);
          if (!response.ok) {
            console.warn(`[Game Poll] Failed to fetch game state: ${response.status}`);
            return;
          }
          const payload = response.data;

          if (payload.ok) {
            if (!lastVersionRef.current || payload.snapshot.version > lastVersionRef.current) {
              lastVersionRef.current = payload.snapshot.version;
              if (gameRef.current) {
                gameRef.current.state = payload.snapshot.state;
                gameRef.current.config = payload.snapshot.config;
              }
              setGameState(payload.snapshot.state);
              console.log(`[Game Poll] Updated game state to version ${payload.snapshot.version}`);
            }
          }
        } catch (error) {
          if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
            console.warn('[Game Poll] Request timeout - network may be slow');
          } else {
            console.error('[Game Poll] Error:', error);
          }
        }
      }, 3000) : undefined; // スマホでのネットワーク遅延を考慮して3秒に延長
      pollRef.current = poll || null;
    } catch (error) {
      console.error('[Friend Game] Failed to start game:', error);
      setToast('ゲーム初期化に失敗しました');
      router.push('/home');
    }
  };


  // カードクリック処理
  const handleCardClick = async (card: number) => {
    if (!gameRef.current || !gameState || gameRef.current.state.currentPlayer !== mySeatIndex || isSubmitting || isCardLocked) return;
    
    setIsSubmitting(true);
    setIsCardLocked(true);
    setLockedCardId(card);
    
    try {
      const move: Move = {
        player: mySeatIndex,
        card,
        timestamp: Date.now()
      };
      
      console.log(`[Friend Game] Player ${mySeatIndex} plays card ${card}`);
      // サーバーに移譲
      try {
        const data = await apiJson<FriendGameResponse>(`/friend/game/${roomCode}`, {
          method: 'POST',
          json: { type: 'move', move },
        });
        if (data.ok) {
          lastVersionRef.current = data.snapshot.version ?? lastVersionRef.current + 1;
          if (gameRef.current) {
            gameRef.current.state = data.snapshot.state;
          }
          setGameState(data.snapshot.state);
        }
      } catch (moveError) {
        console.error('[Friend Game] Failed to submit move:', moveError);
      }
    } catch (error) {
      console.error('[Friend Game] Error during move:', error);
    } finally {
      setIsSubmitting(false);
      setIsCardLocked(false);
      setLockedCardId(null);
    }
  };

  // タイムアウト処理
  const handleTimeout = () => {
    if (!gameState || gameOver || gameState.currentPlayer !== mySeatIndex) return;
    
    // 制限時間切れ時のランダムカード選択
    const legalMoves = getLegalMoves(gameState, mySeatIndex);
    if (legalMoves.length > 0) {
      // ランダムにカードを選択
      const randomIndex = Math.floor(Math.random() * legalMoves.length);
      const selectedCard = legalMoves[randomIndex];
      console.log(`[Friend Timeout] Player ${mySeatIndex} auto-selecting random card: ${selectedCard} from legal moves:`, legalMoves);
      handleCardClick(selectedCard);
    } else {
      // 合法手がない場合は最小カードを選択
        const hand = gameState.players[mySeatIndex].hand;
      if (hand.length > 0) {
        const minCard = Math.min(...hand);
        console.log(`[Friend Timeout] Player ${mySeatIndex} no legal moves, selecting minimum card: ${minCard}`);
        handleCardClick(minCard);
      }
    }
  };

  // ページの可視性監視（切断検知）
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;

      // ゲームが初期化されていない場合は切断検知しない
      if (!isGameInitialized) {
        return;
      }

      if (!isVisible && !disconnectStartTime) {
        // ページが非表示になった時刻を記録
        setDisconnectStartTime(Date.now());
        console.log(`[Friend] Player ${mySeatIndex} disconnected - starting 45s timer`);
      } else if (isVisible && disconnectStartTime) {
        // ページが再表示された場合、切断タイマーをリセット
        setDisconnectStartTime(null);
        console.log(`[Friend] Player ${mySeatIndex} reconnected - canceling disconnect timer`);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [disconnectStartTime, isGameInitialized, mySeatIndex]);

  // 切断タイマーの管理
  useEffect(() => {
    if (disconnectStartTime && isGameInitialized) {
      const timer = setTimeout(() => {
        // 45秒経過後、CPUに置き換え
        console.log(`[Friend] 45 seconds elapsed - replacing player ${mySeatIndex} with CPU`);
        setCpuReplacedPlayers(prev => new Set(prev).add(mySeatIndex));
        setDisconnectStartTime(null);
      }, 45000); // 45秒

      return () => clearTimeout(timer);
    }
  }, [disconnectStartTime, mySeatIndex, isGameInitialized]);

  // ゲーム開始
  useEffect(() => {
    if (roomCode) {
      startGame();
    }
    return () => {
      // ページ離脱時にポーリングを確実に停止
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
    };
  }, [roomCode]);

  // タイマー管理
  useEffect(() => {
    if (gameState && gameState.currentPlayer === mySeatIndex && gameState.phase === "AwaitMove" && !gameOver) {
      const turnSeconds = getEffectiveTurnSeconds(gameRef.current?.config || { turnSeconds: 10 } as GameConfig);
      if (turnSeconds) {
        timeoutRef.current = setTimeout(handleTimeout, turnSeconds * 1000);
      }
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [gameState?.currentPlayer, gameState?.phase, gameOver, mySeatIndex]);

  if (!gameState) {
    return (
      <BattleLayout>
        <div className="game-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column' }}>
            <div style={{ color: 'white', fontSize: '18px', marginBottom: '20px' }}>
              ゲームを読み込み中...
            </div>
            <div style={{ color: 'white', fontSize: '14px', opacity: 0.8 }}>
              ルーム: {roomCode}
            </div>
          </div>
        </div>
      </BattleLayout>
    );
  }

  return (
    <BattleLayout>
      <div className="game-container">
        <header className="hud battle-hud layer-hud">
          <div className="hud-left">
            <div className="round-indicator" id="roundInfo">
              第{gameState.currentRound}回戦 / 第{gameState.currentTrick}トリック
            </div>
            <div className="room-info">
              ルーム {roomCode}
            </div>
          </div>
          
          <div className="hud-center">
            <Timer
              turnSeconds={gameRef.current ? getEffectiveTurnSeconds(gameRef.current.config) : null}
              isActive={gameState.currentPlayer === mySeatIndex && gameState.phase === "AwaitMove"}
              onTimeout={handleTimeout}
            />
          </div>
          
          <div className="hud-right">
            {/* フレンド対戦中は中断・ホームボタンを非表示 */}
          </div>
        </header>

        <EllipseTable
          state={gameState}
          config={gameRef.current?.config || ({} as GameConfig)}
          currentPlayerIndex={gameState.currentPlayer}
          onCardClick={handleCardClick}
          className={isCardLocked ? 'cards-locked' : ''}
          isSubmitting={isSubmitting}
          lockedCardId={lockedCardId}
          names={roomConfig?.seats.map((seat, idx) => (idx === mySeatIndex ? 'あなた' : seat?.nickname ?? `P${idx + 1}`))}
          mySeatIndex={mySeatIndex}
        />

        {toast && (
          <div className="toast" role="status" aria-live="polite">{toast}</div>
        )}
        
        {/* 切断状態の表示 */}
        {cpuReplacedPlayers.size > 0 && (
          <div className="disconnect-notice">
            <p>一部のプレイヤーが切断されました。CPUに置き換えられました。</p>
            <p>プレイヤー: {Array.from(cpuReplacedPlayers).map(index => 
              roomConfig?.seats[index]?.nickname || `プレイヤー${index + 1}`
            ).join(', ')}</p>
          </div>
        )}
        
        {/* デバッグ情報 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="debug-info" style={{ position: 'fixed', top: '10px', right: '10px', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px', fontSize: '12px' }}>
            <div>Current Player Index: {gameState?.currentPlayer}</div>
            <div>Game Current Player: {gameState?.currentPlayer}</div>
            <div>Is My Turn: {gameState?.currentPlayer === mySeatIndex ? 'Yes' : 'No'}</div>
            <div>Game Initialized: {isGameInitialized ? 'Yes' : 'No'}</div>
          </div>
        )}
        
        {gameOver && (
        <div className="game-over">
          <div className="game-over-content">
            <h2>ゲーム終了</h2>
            <p>お疲れ様でした！</p>
            <a href="/home" className="btn">ホームに戻る</a>
          </div>
        </div>
      )}
      </div>
    </BattleLayout>
  );
}

export default function FriendPlayPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FriendPlayContent />
    </Suspense>
  );
}
