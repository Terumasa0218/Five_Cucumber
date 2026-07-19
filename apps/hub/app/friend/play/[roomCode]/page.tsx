'use client';

import BattleLayout from '@/components/BattleLayout';
import BattleV2Scene from '@/components/battle-v2/LazyBattleV2Scene';
import type { BattleV2CardView } from '@/components/battle-v2/BattleV2Scene';
import { Timer } from '@/components/ui';
import PageBackground from '@/components/ui/PageBackground';
import { BACKGROUNDS } from '@/lib/backgrounds';
import { apiJson, apiRequest } from '@/lib/api';
import { normalizeRoomId } from '@/lib/friend-room';
import {
  GameConfig,
  GameState,
  getEffectiveTurnSeconds,
  getLegalMoves,
  Move,
  SeededRng,
  createInitialState,
} from '@/lib/game-core';
import { getNickname } from '@/lib/profile';
import { USE_SERVER_SYNC } from '@/lib/serverSync';
import { getRoom as getLocalRoom } from '@/lib/roomSystemUnified';
import type { GameSnapshot } from '@/lib/friendGameStore';
import type { Room, RoomResponse, RoomSeat } from '@/types/room';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import '../../../cucumber/cpu/play/game.css';

function FriendPlayContent() {
  const params = useParams();
  const router = useRouter();
  const roomCode = normalizeRoomId(params.roomCode);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameResults, setGameResults] = useState<
    { name: string; cucumbers: number; eliminated: boolean }[]
  >([]);
  const [isCardLocked, setIsCardLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBattleV2CardId, setSelectedBattleV2CardId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
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
  const lastVersionRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debugRooms = process.env.NEXT_PUBLIC_DEBUG_ROOMS === '1';
  const debugWarn = (...args: unknown[]) => {
    if (debugRooms) console.warn(...args);
  };

  type FriendGameResponse = { ok: true; snapshot: GameSnapshot } | { ok: false; reason: string };
  type UpdateStatusResponse = { ok: boolean; reason?: string };

  const resolvePlayerIndex = (seats: RoomSeat[], nickname: string | null): number => {
    if (!nickname) return -1;
    return seats.findIndex((seat) => seat?.nickname === nickname);
  };

  const getPlayerName = useCallback(
    (index: number) => {
      if (index === mySeatIndex) return 'あなた';
      return roomConfig?.seats[index]?.nickname ?? `P${index + 1}`;
    },
    [mySeatIndex, roomConfig],
  );

  // ゲーム終了チェック
  const checkGameOver = useCallback(
    (state: GameState) => {
      const maxCucumbers = gameRef.current?.config.maxCucumbers ?? 6;
      const hasEliminated = state.players.some((p) => p.cucumbers >= maxCucumbers);
      if (hasEliminated) {
        const results = state.players
          .map((player, index) => ({
            name: getPlayerName(index),
            cucumbers: player.cucumbers,
            eliminated: player.cucumbers >= maxCucumbers,
          }))
          .sort((a, b) => a.cucumbers - b.cucumbers);
        setGameResults(results);
        setGameOver(true);
      }
    },
    [getPlayerName],
  );

  // ルーム情報を取得
  const fetchRoomConfig = async (): Promise<{ room: Room; playerIndex: number } | null> => {
    try {
      const nickname = getNickname();

      if (!useServer) {
        const localRoom = getLocalRoom(roomCode);
        if (!localRoom) throw new Error('Local room not found');
        const playerIndex = resolvePlayerIndex(localRoom.seats, nickname);
        if (playerIndex < 0) throw new Error('Player not found in local room');
        setRoomConfig(localRoom);
        setMySeatIndex(playerIndex);
        return { room: localRoom, playerIndex };
      }

      const data = await apiJson<RoomResponse>(`/api/friend/room/${roomCode}`);
      if (!data.ok || !data.room) throw new Error('Invalid room data');

      setRoomConfig(data.room);
      const playerIndex = resolvePlayerIndex(data.room.seats, nickname);
      if (playerIndex < 0) throw new Error('Player not found in room');
      setMySeatIndex(playerIndex);
      return { room: data.room, playerIndex };
    } catch (error) {
      debugWarn('[Friend Game] Failed to fetch room config:', error);
      router.push('/home');
      return null;
    }
  };

  // ゲーム開始
  const startGame = async () => {
    try {
      const info = await fetchRoomConfig();
      if (!info) return;
      const room = info.room;
      const myIndex = info.playerIndex;
      const nickname = getNickname();
      if (!nickname) {
        router.push(`/setup?returnTo=/friend/play/${roomCode}`);
        return;
      }

      if (!useServer) {
        setToast('このローカルルームは待機画面の確認用です。フレンド対戦の開始にはサーバー同期設定が必要です。');
        router.push(`/friend/room/${roomCode}`);
        return;
      }

      // ルームの状態をチェック
      if (room.status !== 'playing') {
        if (myIndex === 0) {
          try {
            await apiJson<UpdateStatusResponse>('/api/friend/status', {
              method: 'POST',
              json: { roomId: roomCode, status: 'playing', nickname },
            });
            room.status = 'playing';
          } catch (e) {
            debugWarn('[Friend Game] Failed to set playing status:', e);
          }
        } else {
          let tries = 0;
          while (tries < 5) {
            await new Promise((resolve) => setTimeout(resolve, 400));
            try {
              const d = await apiJson<RoomResponse>(`/api/friend/room/${roomCode}`);
              if (d.ok && d.room?.status === 'playing') {
                room.status = 'playing';
                break;
              }
            } catch {
              // retry
            }
            tries++;
          }
          if (room.status !== 'playing') {
            router.push(`/friend/room/${roomCode}`);
            return;
          }
        }
      }

      const isPlayerInRoom = room.seats.some((seat) => seat?.nickname === nickname);
      if (!isPlayerInRoom) {
        router.push(`/friend/room/${roomCode}`);
        return;
      }

      const config: GameConfig = {
        players: room.size,
        turnSeconds: room.turnSeconds === 0 ? null : room.turnSeconds,
        maxCucumbers: room.maxCucumbers,
        initialCards: 7,
        seed: Number(room.seed ?? Date.now()),
        cpuLevel: 'normal',
      };

      const { SeededRng: SeededRngClass } = await import('@/lib/game-core');
      const controllers: PlayerController[] = Array.from({ length: room.size }, (_, idx) => ({
        type: 'human' as const,
        name: idx === myIndex ? 'あなた' : (room.seats[idx]?.nickname || `P${idx + 1}`),
      }));

      const isHost = myIndex === 0;
      if (isHost) {
        const rng = new SeededRngClass(config.seed);
        const state = createInitialState(config, rng);
        gameRef.current = { state, config, controllers, rng };
        setGameState(state);
        setGameOver(false);
        setGameResults([]);
        try {
          const data = await apiJson<FriendGameResponse>(`/api/friend/game/${roomCode}`, {
            method: 'POST',
            json: { type: 'init', nickname, state, config },
          });
          if (data.ok) {
            lastVersionRef.current = data.snapshot.version ?? 1;
          }
        } catch (initError) {
          debugWarn('[Friend Game] Failed to persist snapshot:', initError);
        }
      } else {
        // ゲストはサーバーのスナッ��ショットを取得するまで待機
        if (useServer) {
          let retries = 0;
          while (retries < 10) {
            try {
              const data = await apiJson<FriendGameResponse>(`/api/friend/game/${roomCode}?nickname=${encodeURIComponent(nickname)}`);
              if (data.ok) {
                const rng = new SeededRngClass(data.snapshot.config.seed);
                gameRef.current = {
                  state: data.snapshot.state,
                  config: data.snapshot.config,
                  controllers,
                  rng,
                };
                setGameState(data.snapshot.state);
                setGameOver(false);
                setGameResults([]);
                lastVersionRef.current = data.snapshot.version ?? 1;
                break;
              }
            } catch {
              // retry
            }
            retries++;
            await new Promise((r) => setTimeout(r, 500));
          }
        }
      }

      // ポーリングでサーバー権威の状態を反映
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (useServer) {
        pollRef.current = setInterval(async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const response = await apiRequest<FriendGameResponse>(`/api/friend/game/${roomCode}?nickname=${encodeURIComponent(nickname)}`, {
              signal: controller.signal,
              headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
              parseAs: 'json',
            });
            clearTimeout(timeoutId);
            if (!response.ok) return;
            const payload = response.data;

            if (payload.ok) {
              if (!lastVersionRef.current || payload.snapshot.version > lastVersionRef.current) {
                lastVersionRef.current = payload.snapshot.version;
                if (gameRef.current) {
                  gameRef.current.state = payload.snapshot.state;
                  gameRef.current.config = payload.snapshot.config;
                }
                setGameState(payload.snapshot.state);
                // ゲーム終了チェック
                checkGameOver(payload.snapshot.state);
              }
            }
          } catch (error) {
            if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
              debugWarn('[Game Poll] Request timeout');
            }
          }
        }, 3000);
      }
    } catch (error) {
      debugWarn('[Friend Game] Failed to start game:', error);
      setToast('ゲーム初期化に失敗しました');
      router.push('/home');
    }
  };

  // カードクリック処理
  const handleCardClick = async (card: number) => {
    if (!gameRef.current || !gameState || isSubmitting || isCardLocked) return;
    if (gameState.currentPlayer !== mySeatIndex || gameState.phase !== 'AwaitMove') return;

    const legalMoves = getLegalMoves(gameState, mySeatIndex);
    if (!legalMoves.includes(card)) return;

    setIsSubmitting(true);
    setIsCardLocked(true);

    try {
      const isDiscardMove =
        gameState.fieldCard !== null && card < gameState.fieldCard;
      const move: Move = {
        player: mySeatIndex,
        card,
        timestamp: Date.now(),
        isDiscard: isDiscardMove,
      };

      const nickname = getNickname();
      if (!nickname) return;
      const data = await apiJson<FriendGameResponse>(`/api/friend/game/${roomCode}`, {
        method: 'POST',
        json: { type: 'move', nickname, move },
      });
      if (data.ok) {
        lastVersionRef.current = data.snapshot.version ?? lastVersionRef.current + 1;
        if (gameRef.current) {
          gameRef.current.state = data.snapshot.state;
        }
        setGameState(data.snapshot.state);
        checkGameOver(data.snapshot.state);
      }
    } catch (error) {
      debugWarn('[Friend Game] Error during move:', error);
      setToast('カード送信に失敗しました');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsSubmitting(false);
      setIsCardLocked(false);
      setSelectedBattleV2CardId(null);
    }
  };

  // タイムアウト処理
  const handleTimeout = useCallback(() => {
    if (!gameState || gameOver || gameState.currentPlayer !== mySeatIndex) return;
    const legalMoves = getLegalMoves(gameState, mySeatIndex);
    if (legalMoves.length > 0) {
      const randomIndex = Math.floor(Math.random() * legalMoves.length);
      handleCardClick(legalMoves[randomIndex]);
    }
  }, [gameState, gameOver, mySeatIndex]);

  const handleBackToHome = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    router.push('/home');
  };

  // ゲーム開始
  useEffect(() => {
    if (roomCode) startGame();
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  // タイマー管理
  useEffect(() => {
    if (
      gameState &&
      gameState.currentPlayer === mySeatIndex &&
      gameState.phase === 'AwaitMove' &&
      !gameOver
    ) {
      const turnSeconds = getEffectiveTurnSeconds(
        gameRef.current?.config || ({ turnSeconds: 10 } as GameConfig),
      );
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
  }, [gameState?.currentPlayer, gameState?.phase, gameOver, mySeatIndex, handleTimeout]);

  if (!gameState) {
    return (
      <>
        <PageBackground image={BACKGROUNDS.battle} />
        <BattleLayout showOrientationHint>
          <div className="grid place-items-center flex-1 text-white/80">
            <div className="text-center">
              <div className="text-lg mb-2">ゲームを読み込み中...</div>
              <div className="text-sm opacity-70">ルーム: {roomCode}</div>
            </div>
          </div>
        </BattleLayout>
      </>
    );
  }

  const displayNames = roomConfig?.seats.map((seat, idx) =>
    idx === mySeatIndex ? 'あなた' : (seat?.nickname ?? `P${idx + 1}`),
  ) ?? gameState.players.map((_, idx) => (idx === mySeatIndex ? 'あなた' : `P${idx + 1}`));
  const isMyTurn =
    !gameOver && gameState.currentPlayer === mySeatIndex && gameState.phase === 'AwaitMove';
  const battleV2LegalMoves =
    isMyTurn && !isSubmitting && !isCardLocked ? getLegalMoves(gameState, mySeatIndex) : [];
  const battleV2Timer = (
    <Timer
      turnSeconds={gameRef.current ? getEffectiveTurnSeconds(gameRef.current.config) : null}
      isActive={isMyTurn}
      onTimeout={handleTimeout}
    />
  );

  return (
    <BattleLayout
      showOrientationHint
      className="cpu-play-layout cpu-play-layout--v2"
    >
        <div className="cpu-play-v2-scene" aria-label="フレンド対局">
          <div className="cpu-play-v2-hud" aria-label="対局情報">
            <div className="cpu-play-v2-round">
              第{gameState.currentRound}回戦 / 第{gameState.currentTrick}トリック
            </div>
            {isMyTurn ? <div className="cpu-play-v2-timer">{battleV2Timer}</div> : null}
          </div>
          <BattleV2Scene
            state={gameState}
            names={displayNames}
            viewerIndex={mySeatIndex}
            selectedCardId={selectedBattleV2CardId}
            playedCards={gameState.trickCards}
            legalMoves={battleV2LegalMoves}
            onSelectCard={(card: BattleV2CardView) => {
              if (!battleV2LegalMoves.includes(card.value)) return;
              setSelectedBattleV2CardId(card.id);
              void handleCardClick(card.value);
            }}
          />
        </div>

        {toast && (
          <div className="toast" role="status" aria-live="polite">
            {toast}
          </div>
        )}

        {gameOver && (
          <div className="game-over-overlay">
            <div className="game-over-overlay__title">
              {gameResults
                .filter((r) => r.eliminated)
                .map((r) => r.name)
                .join('、')}{' '}
              お漬物！！！
            </div>

            <div className="game-over-overlay__result">
              <h2>結果</h2>
              {gameResults.map((result, index) => (
                <div
                  key={`${result.name}-${index}`}
                  className={`game-over-overlay__rank ${result.eliminated ? 'is-eliminated' : ''}`}
                >
                  <span>
                    {index + 1}位 {result.name}
                  </span>
                  <span>
                    🥒 {result.cucumbers}本 {result.eliminated ? '💀' : ''}
                  </span>
                </div>
              ))}
            </div>

            <a className="game-over-overlay__home" href="/home" onClick={handleBackToHome}>
              ホームへ戻る
            </a>
          </div>
        )}
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
