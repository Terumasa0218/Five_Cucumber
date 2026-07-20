'use client';

import BattleLayout from '@/components/BattleLayout';
import BattleV2Scene from '@/components/battle-v2/LazyBattleV2Scene';
import type {
  BattleV2CardView,
  BattleV2MovingCard,
} from '@/components/battle-v2/BattleV2Scene';
import { Timer } from '@/components/ui';
import PageBackground from '@/components/ui/PageBackground';
import { BACKGROUNDS } from '@/lib/backgrounds';
import { ApiRequestError, apiJson, apiRequest } from '@/lib/api';
import {
  clampPlayers,
  getHandCardPose,
  getOpponentCardPose,
  pilePositions,
  playerHandOrigin,
  screenFacingRotation,
  seatLayouts,
  type CardPose,
  type Euler3,
  type Vec3,
} from '@/lib/battle-v2/layout';
import { friendAuthFailureMessage } from '@/lib/friendApiErrors';
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

function addVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function rotateVec3Y(position: Vec3, radians: number): Vec3 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [
    position[0] * cos - position[2] * sin,
    position[1],
    position[0] * sin + position[2] * cos,
  ];
}

function combinePose(parentPosition: Vec3, parentRotation: Euler3, childPose: CardPose): CardPose {
  return {
    position: addVec3(parentPosition, rotateVec3Y(childPose.position, parentRotation[1])),
    rotation: [
      parentRotation[0] + childPose.rotation[0],
      parentRotation[1] + childPose.rotation[1],
      parentRotation[2] + childPose.rotation[2],
    ],
    scale: childPose.scale,
  };
}

function getVisualIndex(logicalIndex: number, viewerIndex: number, players: number): number {
  return (logicalIndex - viewerIndex + players) % players;
}

function createFriendBattleV2MoveAnimation(
  state: GameState,
  viewerIndex: number,
  player: number,
  card: number,
  isDiscardMove: boolean,
  timestamp: number,
  actorLabel: string
): BattleV2MovingCard | null {
  const playerState = state.players[player];
  if (!playerState) return null;

  const cardIndex = playerState.hand.indexOf(card);
  if (cardIndex < 0) return null;

  const visualIndex = getVisualIndex(player, viewerIndex, state.players.length);
  const from =
    visualIndex === 0
      ? combinePose(
          playerHandOrigin,
          screenFacingRotation,
          getHandCardPose(cardIndex, playerState.hand.length, true)
        )
      : (() => {
          const layout = seatLayouts[clampPlayers(state.players.length)];
          const seat = layout[visualIndex];
          if (!seat) return null;
          return combinePose(
            seat.position,
            seat.rotation,
            getOpponentCardPose(cardIndex, playerState.hand.length)
          );
        })();

  if (!from) return null;

  return {
    id: `${player}-${card}-${timestamp}`,
    value: card,
    actorLabel,
    from,
    to: {
      position: isDiscardMove
        ? [
            pilePositions.graveyard[0],
            pilePositions.graveyard[1] + 0.12,
            pilePositions.graveyard[2],
          ]
        : [pilePositions.field[0], pilePositions.field[1] + 0.14, pilePositions.field[2]],
      rotation: [0, isDiscardMove ? 0.16 : 0.28, 0],
      scale: 1,
    },
  };
}

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
  const [tableTrickCards, setTableTrickCards] = useState<Move[]>([]);
  const [battleV2MovingCard, setBattleV2MovingCard] = useState<BattleV2MovingCard | null>(null);
  const [battleV2HiddenMoveKey, setBattleV2HiddenMoveKey] = useState<string | null>(null);
  const [trickWinner, setTrickWinner] = useState<number | null>(null);
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
  const resolvedTrickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastResolvedTrickKeyRef = useRef<string | null>(null);
  const battleV2MovingCardRef = useRef<BattleV2MovingCard | null>(null);
  const lastVersionRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debugRooms = process.env.NEXT_PUBLIC_DEBUG_ROOMS === '1';
  const debugWarn = (...args: unknown[]) => {
    if (debugRooms) console.warn(...args);
  };

  const getOnlineFailureMessage = (error: unknown, fallback: string): string => {
    if (error instanceof ApiRequestError) {
      const authMessage = friendAuthFailureMessage(
        error.response.status,
        error.response.data as { reason?: string; detail?: unknown; error?: string } | undefined
      );
      if (authMessage) return authMessage;
    }
    return fallback;
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

  const updateBattleV2MovingCard = useCallback((movingCard: BattleV2MovingCard | null) => {
    battleV2MovingCardRef.current = movingCard;
    setBattleV2MovingCard(movingCard);
  }, []);

  const clearResolvedTrickTimer = useCallback(() => {
    if (resolvedTrickTimeoutRef.current) {
      clearTimeout(resolvedTrickTimeoutRef.current);
      resolvedTrickTimeoutRef.current = null;
    }
  }, []);

  const applyFriendSnapshot = useCallback(
    (snapshot: GameSnapshot) => {
      const previousState = gameRef.current?.state ?? null;
      const previousVersion = lastVersionRef.current;
      const snapshotVersion = snapshot.version ?? previousVersion + 1;
      const isNewerSnapshot = !previousVersion || snapshotVersion > previousVersion;

      if (
        isNewerSnapshot &&
        snapshot.lastMove &&
        previousState &&
        snapshot.lastMove.player !== mySeatIndex &&
        previousState.phase === 'AwaitMove'
      ) {
        const move = snapshot.lastMove;
        const moveKey = `${move.player}-${move.timestamp}`;
        const isDiscardMove = move.isDiscard === true;
        const movingCard = createFriendBattleV2MoveAnimation(
          previousState,
          mySeatIndex,
          move.player,
          move.card,
          isDiscardMove,
          move.timestamp,
          getPlayerName(move.player)
        );
        updateBattleV2MovingCard(movingCard);
        setBattleV2HiddenMoveKey(movingCard && !isDiscardMove ? moveKey : null);
        setTableTrickCards(
          isDiscardMove ? [...previousState.trickCards] : [...previousState.trickCards, move]
        );
      }

      lastVersionRef.current = snapshotVersion;
      if (gameRef.current) {
        gameRef.current.state = snapshot.state;
        gameRef.current.config = snapshot.config;
        if (snapshot.rngState) {
          gameRef.current.rng = SeededRng.fromState(snapshot.rngState);
        }
      }

      setGameState(snapshot.state);
      checkGameOver(snapshot.state);

      const resolvedTrick = snapshot.resolvedTrick;
      const resolvedTrickKey = resolvedTrick
        ? `${resolvedTrick.round}-${resolvedTrick.trick}-${resolvedTrick.completedAt}`
        : null;
      const shouldShowResolvedTrick =
        resolvedTrick &&
        resolvedTrickKey !== lastResolvedTrickKeyRef.current &&
        Date.now() - resolvedTrick.completedAt < 8000;

      if (shouldShowResolvedTrick && resolvedTrickKey) {
        lastResolvedTrickKeyRef.current = resolvedTrickKey;
        clearResolvedTrickTimer();
        setTableTrickCards(resolvedTrick.cards);
        setTrickWinner(resolvedTrick.winner >= 0 ? resolvedTrick.winner : null);

        resolvedTrickTimeoutRef.current = setTimeout(() => {
          resolvedTrickTimeoutRef.current = null;
          const currentState = gameRef.current?.state ?? snapshot.state;
          setTableTrickCards(currentState.trickCards);
          setTrickWinner(null);
        }, 1700);
        return;
      }

      if (!resolvedTrickTimeoutRef.current && !battleV2MovingCardRef.current) {
        setTableTrickCards(snapshot.state.trickCards);
        setTrickWinner(null);
      }
    },
    [
      checkGameOver,
      clearResolvedTrickTimer,
      getPlayerName,
      mySeatIndex,
      updateBattleV2MovingCard,
    ]
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
        try {
          const data = await apiJson<FriendGameResponse>(`/api/friend/game/${roomCode}`, {
            method: 'POST',
            json: { type: 'init', nickname, state, config, rngState: rng.getState() },
          });
          if (data.ok) {
            gameRef.current = {
              state: data.snapshot.state,
              config: data.snapshot.config,
              controllers,
              rng: data.snapshot.rngState
                ? SeededRngClass.fromState(data.snapshot.rngState)
                : rng,
            };
            setGameOver(false);
            setGameResults([]);
            applyFriendSnapshot(data.snapshot);
          } else {
            throw new Error(data.reason);
          }
        } catch (initError) {
          debugWarn('[Friend Game] Failed to persist snapshot:', initError);
          setToast(getOnlineFailureMessage(initError, 'ゲーム初期化に失敗しました。サーバー同期設定を確認してください。'));
        }
      } else {
        // ゲストはサーバーのスナッ��ショットを取得するまで待機
        if (useServer) {
          let retries = 0;
          while (retries < 10) {
            try {
              const data = await apiJson<FriendGameResponse>(`/api/friend/game/${roomCode}?nickname=${encodeURIComponent(nickname)}`);
              if (data.ok) {
                const rng = data.snapshot.rngState
                  ? SeededRngClass.fromState(data.snapshot.rngState)
                  : new SeededRngClass(data.snapshot.config.seed);
                gameRef.current = {
                  state: data.snapshot.state,
                  config: data.snapshot.config,
                  controllers,
                  rng,
                };
                setGameOver(false);
                setGameResults([]);
                applyFriendSnapshot(data.snapshot);
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
                applyFriendSnapshot(payload.snapshot);
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
      const nickname = getNickname();
      if (!nickname) return;

      const isDiscardMove =
        gameState.fieldCard !== null && card < gameState.fieldCard;
      const moveTimestamp = Date.now();
      const move: Move = {
        player: mySeatIndex,
        card,
        timestamp: moveTimestamp,
        isDiscard: isDiscardMove,
      };
      const moveKey = `${mySeatIndex}-${moveTimestamp}`;
      const movingCard = createFriendBattleV2MoveAnimation(
        gameState,
        mySeatIndex,
        mySeatIndex,
        card,
        isDiscardMove,
        moveTimestamp,
        'あなた'
      );
      updateBattleV2MovingCard(movingCard);
      setBattleV2HiddenMoveKey(movingCard && !isDiscardMove ? moveKey : null);
      setTableTrickCards(
        isDiscardMove ? [...gameState.trickCards] : [...gameState.trickCards, move]
      );

      const data = await apiJson<FriendGameResponse>(`/api/friend/game/${roomCode}`, {
        method: 'POST',
        json: { type: 'move', nickname, move },
      });
      if (data.ok) {
        applyFriendSnapshot(data.snapshot);
      }
    } catch (error) {
      debugWarn('[Friend Game] Error during move:', error);
      setToast(getOnlineFailureMessage(error, 'カード送信に失敗しました'));
      updateBattleV2MovingCard(null);
      setBattleV2HiddenMoveKey(null);
      setTableTrickCards(gameState.trickCards);
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
      clearResolvedTrickTimer();
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
            playedCards={tableTrickCards}
            movingCard={battleV2MovingCard}
            hiddenPlayedMoveKey={battleV2HiddenMoveKey}
            legalMoves={battleV2LegalMoves}
            trickWinner={trickWinner}
            onMoveComplete={() => {
              updateBattleV2MovingCard(null);
              setBattleV2HiddenMoveKey(null);
            }}
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
