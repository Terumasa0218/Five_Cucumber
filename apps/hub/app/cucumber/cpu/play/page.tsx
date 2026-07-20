'use client';

import BattleLayout from '@/components/BattleLayout';
import BattleV2Scene from '@/components/battle-v2/LazyBattleV2Scene';
import { BattleHud, EllipseTable, Timer } from '@/components/ui';
import type { BattleV2CardView, BattleV2MovingCard } from '@/components/battle-v2/BattleV2Scene';
import { HumanController } from '@/lib/controllers/human';
import { delay, runAnimation } from '@/lib/animQueue';
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
import {
  applyMove,
  calculateFinalTrickPenalty,
  createGameView,
  createInitialState,
  GameConfig,
  GameState,
  getEffectiveTurnSeconds,
  getLegalMoves,
  determineTrickWinner,
  Move,
  PlayerController,
  RngState,
  RuleSetId,
  SeededRng,
  applyCompletedMarketToGameState,
  chooseMarketBidForHand,
  chooseMarketCardForHand,
  createMarketStateFromGameState,
  getCurrentMarketPlayer,
  revealMarketBids,
  submitMarketBid,
  takeMarketCard,
  type MarketBidDecision,
  type MarketState,
  type MarketTakeDecision,
} from '@/lib/game-core';
import { createCpuTableFromUrlParams } from '@/lib/modes';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import './game.css';

const DEBUG_CPU_GAME = process.env.NEXT_PUBLIC_DEBUG_GAME === '1';

function debugGameLog(...args: unknown[]): void {
  if (DEBUG_CPU_GAME) {
    console.log(...args);
  }
}

function shouldUseBattleV2(params: { get(name: string): string | null }): boolean {
  const requestedView = (params.get('view') ?? params.get('ui') ?? '').toLowerCase();
  return requestedView !== 'classic' && requestedView !== 'legacy' && requestedView !== '2d';
}

type MarketUiSession = {
  state: MarketState;
  bidDecisions: MarketBidDecision[];
  takeDecisions: MarketTakeDecision[];
  message: string;
};

type SelectedMarketBid = {
  card: number;
  index: number;
};

function isMarketRuleSet(ruleSet?: RuleSetId): boolean {
  return ruleSet === 'market';
}

function getPlayerLabel(player: number): string {
  return player === 0 ? 'あなた' : `CPU ${player}`;
}

function getMarketStep(phase: MarketState['phase']): number {
  if (phase === 'Bidding') return 1;
  if (phase === 'Choosing') return 3;
  return 4;
}

function getMarketPhaseLabel(phase: MarketState['phase']): string {
  if (phase === 'Bidding') return '交換カード選択';
  if (phase === 'Choosing') return '市場カード取得';
  return '通常対局へ移行';
}

function getMarketBidText(bid: MarketState['bids'][number] | null): string {
  if (!bid) return '未選択';
  if (bid.card === null) return '交換しない';
  return `${bid.card}を提出`;
}

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

function createBattleV2MoveAnimation(
  state: GameState,
  player: number,
  card: number,
  isDiscardMove: boolean,
  timestamp: number
): BattleV2MovingCard | null {
  const playerState = state.players[player];
  if (!playerState) return null;

  const cardIndex = playerState.hand.indexOf(card);
  if (cardIndex < 0) return null;

  const from =
    player === 0
      ? combinePose(
          playerHandOrigin,
          screenFacingRotation,
          getHandCardPose(cardIndex, playerState.hand.length, true)
        )
      : (() => {
          const layout = seatLayouts[clampPlayers(state.players.length)];
          const seat = layout[player];
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
    actorLabel: player === 0 ? 'あなた' : `CPU ${player}`,
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

function CpuPlayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameRef = useRef<{
    state: GameState;
    config: GameConfig;
    controllers: PlayerController[];
    rng: SeededRng;
    humanController: HumanController;
  } | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameResults, setGameResults] = useState<
    { name: string; cucumbers: number; eliminated: boolean }[]
  >([]);
  const [isCardLocked, setIsCardLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockedCardId, setLockedCardId] = useState<number | null>(null);
  const [tableTrickCards, setTableTrickCards] = useState<Move[]>([]);
  const [battleV2MovingCard, setBattleV2MovingCard] = useState<BattleV2MovingCard | null>(null);
  const [battleV2HiddenMoveKey, setBattleV2HiddenMoveKey] = useState<string | null>(null);
  const [latestPlayedKey, setLatestPlayedKey] = useState<string | null>(null);
  const [trickWinner, setTrickWinner] = useState<number | null>(null);
  const [trickWinnerText, setTrickWinnerText] = useState<string | null>(null);
  const [turnNotice, setTurnNotice] = useState<string | null>(null);
  const [finalTrickSelectedPlayers, setFinalTrickSelectedPlayers] = useState<number[]>([]);
  const [finalTrickOpenedPlayers, setFinalTrickOpenedPlayers] = useState<number[]>([]);
  const [finalTrickStatusText, setFinalTrickStatusText] = useState<string | null>(null);
  const [overlayText, setOverlayText] = useState<string | null>(null);
  const [marketSession, setMarketSession] = useState<MarketUiSession | null>(null);
  const [selectedMarketBid, setSelectedMarketBid] = useState<SelectedMarketBid | null>(null);
  const [finalTrickStarted, setFinalTrickStarted] = useState(false);
  const [isShowdownMode, setIsShowdownMode] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const cpuTurnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finalTrickTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isProcessingRef = useRef<boolean>(false);
  const scheduleCpuTurnRef = useRef<(() => void) | null>(null);
  const playCpuTurnRef = useRef<(() => Promise<void>) | null>(null);

  const clearFinalTrickTimers = useCallback(() => {
    for (const timer of finalTrickTimeoutsRef.current) {
      clearTimeout(timer);
    }
    finalTrickTimeoutsRef.current = [];
  }, []);

  // ゲーム状態の保存キー
  const getGameStateKey = useCallback((params: URLSearchParams) => {
    const players = params.get('players') || '4';
    const turnSeconds = params.get('turnSeconds') || '15';
    const maxCucumbers = params.get('maxCucumbers') || '6';
    const cpuLevel = params.get('cpuLevel') || 'normal';
    const ruleSet = params.get('ruleSet') || 'classic';
    return `cpu-game-state-${players}-${turnSeconds}-${maxCucumbers}-${cpuLevel}-${ruleSet}`;
  }, []);

  // CPU対戦のセーブデータをクリア（新規開始用）
  const clearCpuGameState = () => {
    try {
      const gameStateKey = getGameStateKey(searchParams);
      localStorage.removeItem(gameStateKey);
      debugGameLog('[Game] CPU game state cleared for fresh start');
    } catch (error) {
      console.warn('[Game] Failed to clear CPU game state:', error);
    }
  };

  const scheduleCpuTurn = useCallback(() => {
    if (
      !gameRef.current ||
      !gameState ||
      marketSession ||
      isProcessingRef.current ||
      isAnimating ||
      finalTrickStarted
    )
      return;

    const { state } = gameRef.current;

    // 条件チェック
    if (
      state.currentPlayer === 0 ||
      gameOver ||
      state.phase !== 'AwaitMove' ||
      state.isFinalTrick
    ) {
      return;
    }

    // 既存のタイマーをクリア
    if (cpuTurnTimerRef.current) {
      clearTimeout(cpuTurnTimerRef.current);
      cpuTurnTimerRef.current = null;
    }

    debugGameLog(`[CPU] Scheduling turn for player ${state.currentPlayer}`);

    // CPUの思考時間
    const thinkingTime = 600 + Math.random() * 400;
    cpuTurnTimerRef.current = setTimeout(() => {
      if (gameRef.current && !isProcessingRef.current && playCpuTurnRef.current) {
        void playCpuTurnRef.current();
      }
    }, thinkingTime);
  }, [finalTrickStarted, gameState, gameOver, isAnimating, marketSession]);

  // refを更新
  useEffect(() => {
    scheduleCpuTurnRef.current = scheduleCpuTurn;
  }, [scheduleCpuTurn]);

  const resetRoundVisualState = useCallback(() => {
    setTableTrickCards([]);
    setBattleV2MovingCard(null);
    setBattleV2HiddenMoveKey(null);
    setLatestPlayedKey(null);
    setTrickWinner(null);
    setTrickWinnerText(null);
    setTurnNotice(null);
    setFinalTrickSelectedPlayers([]);
    setFinalTrickOpenedPlayers([]);
    setFinalTrickStatusText(null);
    setFinalTrickStarted(false);
    setIsShowdownMode(false);
  }, []);

  const finishMarketPhase = useCallback(
    (marketState: MarketState, takeDecisions: MarketTakeDecision[]) => {
      if (!gameRef.current) return;

      const applied = applyCompletedMarketToGameState(gameRef.current.state, marketState);
      if (!applied.success) {
        setMarketSession(prev =>
          prev ? { ...prev, message: applied.message ?? '仕込み市場の反映に失敗しました。' } : prev
        );
        setIsAnimating(false);
        return;
      }

      const nextState = applied.gameState;
      gameRef.current.state = nextState;
      setGameState(nextState);
      setSelectedMarketBid(null);
      setMarketSession(prev =>
        prev
          ? {
              ...prev,
              state: marketState,
              takeDecisions,
              message: '仕込み市場が完了しました。',
            }
          : null
      );
      setOverlayText('仕込み市場 完了');

      const doneTimer = setTimeout(() => {
        setMarketSession(null);
        setOverlayText(null);
        setIsAnimating(false);

        if (scheduleCpuTurnRef.current && nextState.currentPlayer !== 0) {
          scheduleCpuTurnRef.current();
        }
      }, 1200);
      finalTrickTimeoutsRef.current.push(doneTimer);
    },
    []
  );

  const autoAdvanceMarket = useCallback(
    (
      marketState: MarketState,
      bidDecisions: MarketBidDecision[],
      takeDecisions: MarketTakeDecision[]
    ) => {
      let nextState = marketState;
      const nextTakes = [...takeDecisions];

      while (nextState.phase === 'Choosing') {
        const currentPlayer = getCurrentMarketPlayer(nextState);
        if (currentPlayer === null || currentPlayer === 0) break;

        const turn = nextState.exchangeOrder[nextState.currentExchangeIndex];
        if (!turn) break;

        const decision = chooseMarketCardForHand(nextState.hands[currentPlayer], nextState.market);
        if (!decision) break;

        const take = takeMarketCard(nextState, currentPlayer, decision.card);
        if (!take.success) break;

        nextTakes.push({
          ...decision,
          player: currentPlayer,
          bidCard: turn.bidCard,
        });
        nextState = take.state;
      }

      setMarketSession(prev =>
        prev
          ? {
              ...prev,
              state: nextState,
              bidDecisions,
              takeDecisions: nextTakes,
              message:
                nextState.phase === 'Choosing'
                  ? 'あなたの取得順です。市場から1枚選んでください。'
                  : '市場交換を整理しています。',
            }
          : {
              state: nextState,
              bidDecisions,
              takeDecisions: nextTakes,
              message:
                nextState.phase === 'Choosing'
                  ? 'あなたの取得順です。市場から1枚選んでください。'
                  : '市場交換を整理しています。',
            }
      );

      if (nextState.phase === 'Complete') {
        finishMarketPhase(nextState, nextTakes);
      }
    },
    [finishMarketPhase]
  );

  const startMarketPhase = useCallback(
    (state: GameState) => {
      try {
        const marketState = createMarketStateFromGameState(state, { extraCards: 2 });
        if (gameRef.current) {
          gameRef.current.state = state;
        }
        setGameState(state);
        resetRoundVisualState();
        setMarketSession({
          state: marketState,
          bidDecisions: [],
          takeDecisions: [],
          message: `第${state.currentRound}回戦の仕込み市場です。`,
        });
        setSelectedMarketBid(null);
        setOverlayText(null);
        setIsAnimating(true);
      } catch (error) {
        console.error('[Market] Failed to start market phase:', error);
        setMarketSession(null);
        setSelectedMarketBid(null);
        setIsAnimating(false);
        if (gameRef.current) {
          gameRef.current.state = state;
        }
        setGameState(state);

        if (scheduleCpuTurnRef.current && state.currentPlayer !== 0) {
          scheduleCpuTurnRef.current();
        }
      }
    },
    [resetRoundVisualState]
  );

  const handleSubmitMarketBid = useCallback(
    (card: number | null) => {
      if (!marketSession || marketSession.state.phase !== 'Bidding') return;

      const humanBid = submitMarketBid(marketSession.state, 0, card);
      if (!humanBid.success) {
        setMarketSession(prev =>
          prev ? { ...prev, message: humanBid.message ?? '入札に失敗しました。' } : prev
        );
        return;
      }

      let nextState = humanBid.state;
      const bidDecisions: MarketBidDecision[] = [];

      for (let player = 1; player < nextState.hands.length; player++) {
        const decision = chooseMarketBidForHand(player, nextState.hands[player], nextState.market);
        const result = submitMarketBid(nextState, player, decision.card);
        if (!result.success) {
          setMarketSession(prev =>
            prev
              ? { ...prev, message: result.message ?? `CPU ${player}の入札に失敗しました。` }
              : prev
          );
          return;
        }
        bidDecisions.push(decision);
        nextState = result.state;
      }

      const revealed = revealMarketBids(nextState);
      if (!revealed.success) {
        setMarketSession(prev =>
          prev ? { ...prev, message: revealed.message ?? '入札公開に失敗しました。' } : prev
        );
        return;
      }

      setSelectedMarketBid(null);
      setMarketSession({
        state: revealed.state,
        bidDecisions,
        takeDecisions: [],
        message:
          revealed.state.phase === 'Choosing'
            ? '入札を公開しました。大きいカード順に市場から取得します。'
            : '全員が交換しませんでした。',
      });
      autoAdvanceMarket(revealed.state, bidDecisions, []);
    },
    [autoAdvanceMarket, marketSession]
  );

  const handleTakeMarketCard = useCallback(
    (card: number) => {
      if (!marketSession || marketSession.state.phase !== 'Choosing') return;

      const currentPlayer = getCurrentMarketPlayer(marketSession.state);
      if (currentPlayer !== 0) return;

      const turn = marketSession.state.exchangeOrder[marketSession.state.currentExchangeIndex];
      const result = takeMarketCard(marketSession.state, 0, card);
      if (!result.success) {
        setMarketSession(prev =>
          prev ? { ...prev, message: result.message ?? '市場カードの取得に失敗しました。' } : prev
        );
        return;
      }

      const nextTakes = [
        ...marketSession.takeDecisions,
        {
          player: 0,
          bidCard: turn?.bidCard ?? -1,
          card,
          score: 0,
        },
      ];

      setMarketSession({
        ...marketSession,
        state: result.state,
        takeDecisions: nextTakes,
        message: `${getPlayerLabel(0)}が${card}を取得しました。`,
      });
      autoAdvanceMarket(result.state, marketSession.bidDecisions, nextTakes);
    },
    [autoAdvanceMarket, marketSession]
  );

  const startGame = useCallback(async () => {
    try {
      const { config, controllers, humanController } = createCpuTableFromUrlParams(searchParams);
      const { SeededRng } = await import('@/lib/game-core');
      const rng = new SeededRng(config.seed);
      const state = createInitialState(config, rng);

      gameRef.current = { state, config, controllers, rng, humanController };
      setGameOver(false);
      setGameResults([]);
      resetRoundVisualState();
      setOverlayText(null);
      setMarketSession(null);
      setSelectedMarketBid(null);

      debugGameLog('[Game] New game started with', config.players, 'players');

      if (isMarketRuleSet(config.ruleSet)) {
        startMarketPhase(state);
        return;
      }

      setGameState(state);
      setIsAnimating(false);

      // 最初のプレイヤーがCPUの場合は自動プレイ
      if (state.currentPlayer !== 0) {
        setTimeout(() => {
          if (
            gameRef.current &&
            gameRef.current.state.currentPlayer !== 0 &&
            scheduleCpuTurnRef.current
          ) {
            scheduleCpuTurnRef.current();
          }
        }, 2000);
      }
    } catch (error) {
      console.error('[Game] Failed to start game:', error);
    }
  }, [resetRoundVisualState, searchParams, startMarketPhase]);

  useEffect(() => {
    document.title = 'CPU対戦 | Five Cucumber';

    // リファラーをチェックして新規開始かリロード復元かを判定
    // document.referrerの代わりにnavigation APIを使用
    const navigation =
      typeof performance !== 'undefined' && performance.getEntriesByType
        ? (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)
        : null;
    const referrer =
      navigation?.type === 'navigate'
        ? (navigation as { name?: string }).name || document.referrer
        : document.referrer;
    const isFromHome =
      !referrer ||
      referrer.includes('/home') ||
      referrer.includes('/cucumber/cpu/settings') ||
      referrer.includes('/cpu/settings');
    const gameStateKey = getGameStateKey(searchParams);

    // ホームから来た場合は常に新規ゲーム開始
    if (isFromHome) {
      debugGameLog('[Game] Starting fresh game (from home/settings)');
      clearCpuGameState();
      // 新規ゲーム開始
      startGame();
    } else {
      // リロード復元を試行
      const tryRestore = async () => {
        try {
          const savedData = localStorage.getItem(gameStateKey);
          if (savedData) {
            const parsed = JSON.parse(savedData) as {
              config: GameConfig;
              rngState?: RngState;
              gameState: GameState;
              gameOver: boolean;
              gameResults?: { name: string; cucumbers: number; eliminated: boolean }[];
              timestamp: number;
            };
            const now = Date.now();
            const age = now - parsed.timestamp;

            // 5分以内のセーブデータのみ復元
            if (age < 5 * 60 * 1000) {
              debugGameLog(
                '[Game] Restoring from saved state (age:',
                Math.round(age / 1000),
                'seconds)'
              );
              // RNG復元とコントローラ再構築
              const { SeededRng: SeededRngClass } = await import('@/lib/game-core');
              const restoredRng = new SeededRngClass(parsed.config?.seed);
              if (
                parsed.rngState &&
                typeof parsed.rngState === 'object' &&
                'seed' in parsed.rngState &&
                'state' in parsed.rngState
              ) {
                restoredRng.setState(parsed.rngState);
              }

              // URLパラメータ or 保存されたconfigでテーブルを再生成
              const { config, controllers, humanController } =
                createCpuTableFromUrlParams(searchParams);
              const state = parsed.gameState;

              gameRef.current = { state, config, controllers, rng: restoredRng, humanController };
              setGameState(state);
              setGameOver(parsed.gameOver || false);
              setGameResults(parsed.gameResults || []);
              setTableTrickCards(state.trickCards || []);
              setBattleV2MovingCard(null);
              setBattleV2HiddenMoveKey(null);
              setLatestPlayedKey(null);
              setTrickWinner(null);
              setTrickWinnerText(null);
              setTurnNotice(null);
              setFinalTrickSelectedPlayers([]);
              setFinalTrickOpenedPlayers([]);
              setFinalTrickStatusText(null);
              setOverlayText(null);
              setMarketSession(null);
              setSelectedMarketBid(null);
              setFinalTrickStarted(false);
              setIsShowdownMode(false);
              setIsAnimating(false);

              debugGameLog('[Game] State restored successfully with rebuilt controllers');
              return;
            } else {
              debugGameLog('[Game] Saved state too old, starting fresh');
              clearCpuGameState();
              startGame();
            }
          } else {
            startGame();
          }
        } catch (error) {
          console.warn('[Game] Failed to restore state:', error);
          clearCpuGameState();
          startGame();
        }
      };
      void tryRestore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playCpuTurn = async () => {
    if (!gameRef.current || isProcessingRef.current || isAnimating) return;

    isProcessingRef.current = true;
    cpuTurnTimerRef.current = null;

    try {
      const { state, config, controllers } = gameRef.current;
      const currentPlayer = state.currentPlayer;

      if (currentPlayer === 0 || gameOver || state.phase !== 'AwaitMove' || isAnimating) {
        debugGameLog(
          `[CPU] Skipping turn - Player: ${currentPlayer}, Phase: ${state.phase}, GameOver: ${gameOver}`
        );
        return;
      }

      debugGameLog(`[CPU] Executing turn for player ${currentPlayer}`);

      const controller = controllers[currentPlayer];
      if (!controller) {
        console.error(`[CPU] Controller not found for player ${currentPlayer}`);
        return;
      }

      const legalMoves = getLegalMoves(state, currentPlayer);
      if (legalMoves.length === 0) {
        console.warn(`[CPU] No legal moves for player ${currentPlayer}`);
        return;
      }

      const view = createGameView(state, config, currentPlayer);
      const move = await controller.onYourTurn(view);

      if (move !== null && typeof move === 'number' && legalMoves.includes(move)) {
        debugGameLog(`[CPU] Playing move: ${move}`);
        await playMove(currentPlayer, move);
      } else {
        // フォールバック: 最初の合法手
        const fallbackMove = legalMoves[0];
        debugGameLog(`[CPU] Using fallback move: ${fallbackMove}`);
        await playMove(currentPlayer, fallbackMove);
      }

      debugGameLog(`[CPU] Turn completed for player ${currentPlayer}`);

      // ターン完了後、次のCPUターンをスケジューリング
      setTimeout(() => {
        if (gameRef.current && !gameOver) {
          const { state } = gameRef.current;
          if (state.currentPlayer !== 0 && state.phase === 'AwaitMove') {
            debugGameLog(`[CPU] Auto-scheduling next turn for player ${state.currentPlayer}`);
            if (scheduleCpuTurnRef.current) {
              scheduleCpuTurnRef.current();
            }
          }
        }
      }, 100); // 少し遅延させて状態更新を確実にする
    } catch (error) {
      console.error('[CPU] Turn error:', error);
    } finally {
      isProcessingRef.current = false;
      debugGameLog(`[CPU] Processing flag cleared`);
    }
  };

  useEffect(() => {
    playCpuTurnRef.current = playCpuTurn;
  });

  const startNextRound = useCallback(
    (state: GameState) => {
      const nextRound = state.currentRound;
      setGameState(state);
      if (gameRef.current) {
        gameRef.current.state = state;
      }
      resetRoundVisualState();
      setMarketSession(null);
      setSelectedMarketBid(null);

      if (isMarketRuleSet(gameRef.current?.config.ruleSet)) {
        startMarketPhase(state);
        return;
      }

      setIsAnimating(true);
      setOverlayText(`第${nextRound}回戦 開始！`);

      const openTimer = setTimeout(() => {
        setOverlayText(null);
        setIsAnimating(false);

        if (scheduleCpuTurnRef.current && state.currentPlayer !== 0) {
          scheduleCpuTurnRef.current();
        }
      }, 1600);
      finalTrickTimeoutsRef.current.push(openTimer);
    },
    [resetRoundVisualState, startMarketPhase]
  );

  const checkGameOver = useCallback(
    (state: GameState) => {
      const maxCucumbers = gameRef.current?.config.maxCucumbers ?? 6;
      const hasEliminated = state.players.some(player => player.cucumbers >= maxCucumbers);
      if (hasEliminated) {
        const gameStateKey = getGameStateKey(searchParams);
        localStorage.removeItem(gameStateKey);
        clearFinalTrickTimers();

        const results = state.players
          .map((player, index) => ({
            name: index === 0 ? 'あなた' : `CPU ${index}`,
            cucumbers: player.cucumbers,
            eliminated: player.cucumbers >= maxCucumbers,
          }))
          .sort((a, b) => a.cucumbers - b.cucumbers);
        setGameResults(results);
        setGameOver(true);
        setFinalTrickStarted(false);
        setIsAnimating(false);
        setIsSubmitting(false);
        setIsCardLocked(false);
        setLockedCardId(null);
        setBattleV2MovingCard(null);
        setBattleV2HiddenMoveKey(null);
        setOverlayText(null);
        return;
      }

      startNextRound(state);
    },
    [clearFinalTrickTimers, getGameStateKey, searchParams, startNextRound]
  );

  const playMove = async (player: number, card: number) => {
    if (!gameRef.current) return;

    debugGameLog(`[PlayMove] Starting move - Player: ${player}, Card: ${card}`);

    try {
      await runAnimation(async () => {
        if (!gameRef.current) return;

        const { state, config, rng } = gameRef.current;

        if (state.phase !== 'AwaitMove' || state.currentPlayer !== player) {
          return;
        }

        const legalMoves = getLegalMoves(state, player);
        if (!legalMoves.includes(card)) {
          return;
        }

        const isDiscardMove = state.fieldCard !== null && card < state.fieldCard;
        const moveTimestamp = Date.now();
        const move: Move = { player, card, timestamp: moveTimestamp, isDiscard: isDiscardMove };
        const moveKey = `${player}-${moveTimestamp}`;
        const v2MovingCard = shouldUseBattleV2(searchParams)
          ? createBattleV2MoveAnimation(state, player, card, isDiscardMove, moveTimestamp)
          : null;
        const trickCardsAfterPlay = isDiscardMove
          ? [...state.trickCards]
          : [...state.trickCards, move];
        const actionCountAfterPlay = (state.actionCount ?? 0) + 1;
        const isTrickCompleteAfterPlay = actionCountAfterPlay === config.players;
        const isFinalTrickMode = state.currentTrick === config.initialCards;

        const playersAfterPlay = state.players.map((p, idx) => {
          if (idx !== player) return p;

          const nextHand = [...p.hand];
          const cardIndex = nextHand.indexOf(card);
          if (cardIndex >= 0) {
            nextHand.splice(cardIndex, 1);
          }

          return { ...p, hand: nextHand };
        });

        const previewState: GameState = {
          ...state,
          players: playersAfterPlay,
          currentPlayer: isTrickCompleteAfterPlay ? -1 : (state.currentPlayer + 1) % config.players,
          fieldCard: isDiscardMove ? state.fieldCard : card,
          sharedGraveyard: isDiscardMove ? [...state.sharedGraveyard, card] : state.sharedGraveyard,
          trickCards: trickCardsAfterPlay,
          actionCount: actionCountAfterPlay,
          phase: isTrickCompleteAfterPlay ? 'ResolvingTrick' : 'AwaitMove',
          isFinalTrick: isFinalTrickMode,
        };

        const result = applyMove(state, move, config, rng);
        if (!result.success) {
          return;
        }

        let newState = result.newState;

        gameRef.current.state = previewState;
        setGameState(previewState);
        setTableTrickCards(trickCardsAfterPlay);
        setLatestPlayedKey(moveKey);
        setBattleV2MovingCard(v2MovingCard);
        setBattleV2HiddenMoveKey(v2MovingCard && !isDiscardMove ? moveKey : null);
        setTrickWinner(null);
        setTrickWinnerText(null);

        if (isFinalTrickMode) {
          setFinalTrickSelectedPlayers(prev => (prev.includes(player) ? prev : [...prev, player]));
        } else if (isDiscardMove) {
          const actorName = player === 0 ? 'あなた' : `CPU ${player}`;
          setTurnNotice(`${actorName} は出せるカードがないため ${card} を捨てました`);
        } else {
          setTurnNotice(null);
        }

        await delay(config.minTurnMs || 500);

        if (isTrickCompleteAfterPlay) {
          setIsAnimating(true);
          const winner = determineTrickWinner(trickCardsAfterPlay);

          if (!isFinalTrickMode) {
            await delay(1500);
          }

          setTrickWinner(winner);

          if (isFinalTrickMode) {
            const winnerName = winner === 0 ? 'あなた' : `CPU ${winner}`;
            const allOnes = trickCardsAfterPlay.every(trickCard => trickCard.card === 1);
            if (allOnes) {
              setTrickWinnerText('全員が1を出したためペナルティなし！');
            } else {
              const penaltyResult = calculateFinalTrickPenalty(trickCardsAfterPlay, config);
              const hasOne = trickCardsAfterPlay.some(trickCard => trickCard.card === 1);
              const basePenalty = hasOne
                ? Math.floor(penaltyResult.penalty / 2)
                : penaltyResult.penalty;
              const penaltyText = `${winnerName}が${penaltyResult.penalty}本のきゅうりを獲得しました`;
              setTrickWinnerText(
                hasOne
                  ? `${penaltyText}（場に1があるため2倍: ${basePenalty}×2=${penaltyResult.penalty}）`
                  : penaltyText
              );
            }
            setFinalTrickStatusText('最終トリック結果');
          }

          await delay(1600);

          gameRef.current.state = newState;
          setGameState(newState);
          setTableTrickCards([]);
          setLatestPlayedKey(null);
          setTrickWinner(null);
          setTrickWinnerText(null);
          setTurnNotice(null);
          setFinalTrickSelectedPlayers([]);
          setFinalTrickOpenedPlayers([]);
          setFinalTrickStatusText(null);
          setIsShowdownMode(false);
          setIsAnimating(false);
        } else {
          gameRef.current.state = newState;
          setGameState(newState);
        }

        if (player === 0) {
          setTimeout(() => {
            if (gameRef.current && !gameOver) {
              const { state } = gameRef.current;
              if (state.currentPlayer !== 0 && state.phase === 'AwaitMove') {
                if (scheduleCpuTurnRef.current) {
                  scheduleCpuTurnRef.current();
                }
              }
            }
          }, 100);
        }
      });
    } catch (error) {
      console.error('[PlayMove] Error:', error);
    }
  };

  // CPU手番のスケジューリング
  useEffect(() => {
    if (finalTrickStarted) return;
    if (
      gameState &&
      !gameOver &&
      !marketSession &&
      !isProcessingRef.current &&
      !isAnimating &&
      gameRef.current
    ) {
      const { state } = gameRef.current;
      if (state.currentPlayer !== 0 && state.phase === 'AwaitMove' && !state.isFinalTrick) {
        debugGameLog(`[useEffect] Scheduling CPU turn for player ${state.currentPlayer}`);
        if (scheduleCpuTurnRef.current) {
          scheduleCpuTurnRef.current();
        }
      }
    }

    return () => {
      if (cpuTurnTimerRef.current) {
        clearTimeout(cpuTurnTimerRef.current);
        cpuTurnTimerRef.current = null;
      }
    };
  }, [
    finalTrickStarted,
    gameState?.currentPlayer,
    gameState?.phase,
    gameOver,
    isAnimating,
    marketSession,
  ]);

  const handleCardClick = async (card: number) => {
    if (
      !gameRef.current ||
      marketSession ||
      isCardLocked ||
      isSubmitting ||
      isProcessingRef.current ||
      isAnimating
    )
      return;

    const { state } = gameRef.current;
    if (state.isFinalTrick) return;

    if (state.currentPlayer === 0 && state.phase === 'AwaitMove') {
      setIsSubmitting(true);
      setLockedCardId(card);
      setIsCardLocked(true);

      // カードアニメーション
      const cardElement = document.querySelector(`[data-card="${card}"]`);
      if (cardElement) {
        cardElement.classList.add('card-slide-to-field');
      }

      try {
        await playMove(0, card);

        setTimeout(() => {
          setIsCardLocked(false);
          setIsSubmitting(false);
          setLockedCardId(null);
        }, 2000);
      } catch (error) {
        setIsSubmitting(false);
        setLockedCardId(null);
        setIsCardLocked(false);
        console.error('Card play error:', error);
      }
    }
  };

  const handleTimeout = async () => {
    if (
      !gameRef.current ||
      marketSession ||
      gameState?.currentPlayer !== 0 ||
      isProcessingRef.current ||
      isAnimating
    )
      return;

    debugGameLog('[Timeout] Handling timeout for player 0');

    // 制限時間切れ時のランダムカード選択
    const legalMoves = getLegalMoves(gameState, 0);
    if (legalMoves.length > 0) {
      const randomIndex = Math.floor(Math.random() * legalMoves.length);
      const selectedCard = legalMoves[randomIndex];
      debugGameLog(
        `[Timeout] Auto-selecting random card: ${selectedCard} from legal moves:`,
        legalMoves
      );
      await handleCardClick(selectedCard);
    } else {
      const hand = gameState.players[0].hand;
      if (hand.length > 0) {
        const minCard = Math.min(...hand);
        debugGameLog(`[Timeout] No legal moves, selecting minimum card: ${minCard}`);
        await handleCardClick(minCard);
      }
    }
  };

  useEffect(() => {
    debugGameLog(
      '[Showdown-Check] isFinalTrick:',
      gameState?.isFinalTrick,
      'finalTrickStarted:',
      finalTrickStarted,
      'hand length:',
      gameState?.players?.[0]?.hand?.length
    );
    if (!gameState || !gameRef.current || marketSession) return;
    if (!gameState.isFinalTrick || gameState.phase !== 'AwaitMove') return;
    if (finalTrickStarted || isAnimating || isProcessingRef.current) return;

    const useBattleV2 = shouldUseBattleV2(searchParams);
    const resultDelayMs = useBattleV2 ? 2000 : 5000;
    const nextRoundDelayMs = useBattleV2 ? 5600 : 10000;

    const runFinalTrickShowdown = () => {
      if (!gameRef.current) return;
      const { state, config, rng } = gameRef.current;
      if (!state.isFinalTrick || state.phase !== 'AwaitMove') return;

      debugGameLog('[Showdown] === SHOWDOWN STARTING ===');
      let currentState = state;
      const showdownTrickCards: Move[] = [...state.trickCards];
      const displayPlayers = state.players.map(player => ({
        ...player,
        hand: [...player.hand],
        graveyard: [...player.graveyard],
      }));
      const selectedPlayers: number[] = [];
      const playerOrder = Array.from(
        { length: config.players },
        (_, idx) => (state.firstPlayer + idx) % config.players
      );

      for (const playerIndex of playerOrder) {
        const hand = currentState.players[playerIndex]?.hand ?? [];
        if (hand.length === 0) continue;
        const selectedCard = hand[0];
        const move: Move = {
          player: playerIndex,
          card: selectedCard,
          timestamp: Date.now() + playerIndex,
          isDiscard: false,
        };
        showdownTrickCards.push(move);
        debugGameLog('[Showdown] Player', playerIndex, 'card:', selectedCard, 'isDiscard:', false);
        const displayCardIndex = displayPlayers[playerIndex]?.hand.indexOf(selectedCard) ?? -1;
        if (displayCardIndex >= 0) {
          displayPlayers[playerIndex].hand.splice(displayCardIndex, 1);
        }
        const result = applyMove(currentState, move, config, rng);
        debugGameLog('[Showdown] applyMove result:', result.success, result.message);
        if (!result.success) {
          console.error('[Showdown] applyMove failed for player', playerIndex, result.message);
          setFinalTrickStatusText('ショーダウン処理に失敗しました。');
          setFinalTrickStarted(false);
          setIsAnimating(false);
          setOverlayText(null);
          return;
        }
        currentState = result.newState;
        selectedPlayers.push(playerIndex);
      }

      debugGameLog('[Showdown] Final trickCards:', showdownTrickCards);

      const resolvedState = currentState;
      const lastShowdownCard =
        showdownTrickCards[showdownTrickCards.length - 1]?.card ?? state.fieldCard;
      const openedPlayers = showdownTrickCards.map(move => move.player);
      const winner = determineTrickWinner(showdownTrickCards);
      const showdownDisplayState: GameState = {
        ...state,
        players: displayPlayers,
        currentPlayer: -1,
        fieldCard: lastShowdownCard,
        trickCards: showdownTrickCards,
        actionCount: showdownTrickCards.length,
        phase: 'ResolvingTrick',
        isFinalTrick: true,
      };

      setFinalTrickSelectedPlayers(selectedPlayers);
      setFinalTrickOpenedPlayers(openedPlayers);
      setTableTrickCards(showdownTrickCards);
      setLatestPlayedKey(null);
      debugGameLog('[Showdown] Setting state with', showdownTrickCards.length, 'cards');
      setGameState(showdownDisplayState);
      gameRef.current.state = showdownDisplayState;
      setIsAnimating(true);
      setIsShowdownMode(true);
      setTrickWinner(winner);
      setFinalTrickStatusText(null);

      const showResultTimer = setTimeout(() => {
        debugGameLog('[Showdown] Calculating penalty...');
        const winnerName = winner === 0 ? 'あなた' : `CPU ${winner}`;
        const playedCards = showdownTrickCards.filter(trickCard => !trickCard.isDiscard);
        const allOnes =
          playedCards.length > 0 && playedCards.every(trickCard => trickCard.card === 1);
        if (allOnes) {
          setTrickWinnerText('全員が1を出したためペナルティなし！');
          setOverlayText('全員が1を出したためペナルティなし！');
        } else {
          const penaltyResult = calculateFinalTrickPenalty(showdownTrickCards, config);
          const hasOne = playedCards.some(trickCard => trickCard.card === 1);
          const basePenalty = hasOne
            ? Math.floor(penaltyResult.penalty / 2)
            : penaltyResult.penalty;
          const penaltyText = `${winnerName}が${penaltyResult.penalty}本のきゅうりを獲得しました`;
          setTrickWinnerText(
            hasOne
              ? `${penaltyText}（場に1があるため2倍: ${basePenalty}×2=${penaltyResult.penalty}）`
              : penaltyText
          );
          setOverlayText(`${winnerName}が${penaltyResult.penalty}本のきゅうりを獲得！`);
        }
      }, resultDelayMs);

      const nextRoundTimer = setTimeout(() => {
        setTableTrickCards([]);
        setLatestPlayedKey(null);
        setTrickWinner(null);
        setTrickWinnerText(null);
        setTurnNotice(null);
        setFinalTrickSelectedPlayers([]);
        setFinalTrickOpenedPlayers([]);
        setFinalTrickStatusText(null);
        setOverlayText(null);
        setIsShowdownMode(false);
        checkGameOver(resolvedState);
      }, nextRoundDelayMs);

      finalTrickTimeoutsRef.current.push(showResultTimer, nextRoundTimer);
    };

    setFinalTrickStarted(true);
    setTurnNotice(null);
    setTrickWinnerText(null);
    setFinalTrickStatusText(null);
    setFinalTrickSelectedPlayers([]);
    setFinalTrickOpenedPlayers([]);
    setOverlayText(useBattleV2 ? '最終カード\nShowDown' : '最終トリック');

    const showdownTimer = setTimeout(
      () => {
        if (!useBattleV2) {
          setOverlayText('Showdown!');
        }
        const openTimer = setTimeout(
          () => {
            setOverlayText(null);
            runFinalTrickShowdown();
          },
          useBattleV2 ? 0 : 1500
        );
        finalTrickTimeoutsRef.current.push(openTimer);
      },
      useBattleV2 ? 1300 : 2000
    );

    finalTrickTimeoutsRef.current.push(showdownTimer);
  }, [
    checkGameOver,
    gameState?.isFinalTrick,
    gameState?.currentTrick,
    gameState,
    finalTrickStarted,
    isAnimating,
    marketSession,
    searchParams,
  ]);

  useEffect(() => {
    return () => {
      clearFinalTrickTimers();
    };
  }, [clearFinalTrickTimers]);

  const handleBackToHome = () => {
    // ゲーム状態をクリア
    clearFinalTrickTimers();
    const gameStateKey = getGameStateKey(searchParams);
    localStorage.removeItem(gameStateKey);
    router.push('/home');
  };

  const handleRestartGame = () => {
    clearFinalTrickTimers();
    clearCpuGameState();
    void startGame();
  };

  if (!gameState) {
    return (
      <BattleLayout showOrientationHint>
        <div className="grid place-items-center flex-1 text-white/80">Loading...</div>
      </BattleLayout>
    );
  }

  const displayNames = gameState.players.map((_, idx) => (idx === 0 ? 'あなた' : `CPU ${idx}`));
  const fieldCard = gameState.fieldCard;
  const shouldDiscardMinCard =
    gameState.currentPlayer === 0 &&
    gameState.phase === 'AwaitMove' &&
    fieldCard !== null &&
    !gameState.players[0].hand.some(card => card >= fieldCard);

  const displayRound = gameRef.current?.state.currentRound ?? gameState.currentRound;
  const displayTrick = gameRef.current?.state.currentTrick ?? gameState.currentTrick;
  const useBattleV2 = shouldUseBattleV2(searchParams);
  const activeRuleSet = gameRef.current?.config.ruleSet ?? 'classic';
  const isFinalTrickPhase =
    gameState.isFinalTrick || displayTrick === (gameRef.current?.config?.initialCards || 7);
  const battleV2LegalMoves =
    gameState.currentPlayer === 0 &&
    gameState.phase === 'AwaitMove' &&
    !marketSession &&
    !isAnimating &&
    !isFinalTrickPhase
      ? getLegalMoves(gameState, 0)
      : [];
  const showBattleV2Timer =
    useBattleV2 &&
    gameState.currentPlayer === 0 &&
    gameState.phase === 'AwaitMove' &&
    !marketSession &&
    !isAnimating &&
    !isFinalTrickPhase;
  const currentPlayerIndex =
    isAnimating || isFinalTrickPhase || marketSession ? null : gameState.currentPlayer;
  const currentMarketPlayer = marketSession ? getCurrentMarketPlayer(marketSession.state) : null;
  const humanMarketHand = marketSession?.state.hands[0] ?? [];
  const humanBid = marketSession?.state.bids[0]?.card ?? null;
  const humanTake = marketSession?.takeDecisions.find(decision => decision.player === 0);
  const marketStep = marketSession ? getMarketStep(marketSession.state.phase) : 0;
  const selectedMarketBidCard = selectedMarketBid?.card ?? null;
  const currentMarketTurn = marketSession
    ? marketSession.state.exchangeOrder[marketSession.state.currentExchangeIndex]
    : null;
  const canTakeMarketCard =
    marketSession?.state.phase === 'Choosing' && currentMarketPlayer === 0;

  const timer = (
    <Timer
      turnSeconds={gameRef.current ? getEffectiveTurnSeconds(gameRef.current.config) : null}
      isActive={gameState.currentPlayer === 0 && gameState.phase === 'AwaitMove' && !marketSession}
      onTimeout={handleTimeout}
    />
  );

  return (
    <BattleLayout
      showOrientationHint
      className={['cpu-play-layout', useBattleV2 ? 'cpu-play-layout--v2' : '']
        .filter(Boolean)
        .join(' ')}
    >
      {useBattleV2 ? null : (
        <BattleHud
          round={displayRound}
          trick={displayTrick}
          timer={timer}
          onExit={handleBackToHome}
        />
      )}

      {!useBattleV2 && isFinalTrickPhase ? (
        <div className="final-trick-notice" role="status" aria-live="polite">
          最終トリック
        </div>
      ) : null}

      {!useBattleV2 && shouldDiscardMinCard ? (
        <div className="discard-notice" role="status" aria-live="polite">
          出せるカードがありません。最小のカードを捨てます。
        </div>
      ) : null}

      {!useBattleV2 && turnNotice ? (
        <div className="discard-result-notice" role="status" aria-live="polite">
          {turnNotice}
        </div>
      ) : null}

      {useBattleV2 ? (
        <div className="cpu-play-v2-scene" aria-label="CPU対局">
          <div className="cpu-play-v2-hud" aria-label="対局情報">
            <div className="cpu-play-v2-round">
              第{displayRound}回戦 / 第{displayTrick}トリック
              {isMarketRuleSet(activeRuleSet) ? (
                <span className="cpu-play-v2-rule">仕込み市場</span>
              ) : null}
            </div>
            {showBattleV2Timer ? <div className="cpu-play-v2-timer">{timer}</div> : null}
          </div>
          <BattleV2Scene
            state={gameState}
            names={displayNames}
            playedCards={tableTrickCards}
            movingCard={battleV2MovingCard}
            hiddenPlayedMoveKey={battleV2HiddenMoveKey}
            legalMoves={battleV2LegalMoves}
            showdownMode={isShowdownMode}
            trickWinner={trickWinner}
            onMoveComplete={() => {
              setBattleV2MovingCard(null);
              setBattleV2HiddenMoveKey(null);
            }}
            onSelectCard={(card: BattleV2CardView) => {
              if (!battleV2LegalMoves.includes(card.value)) return;
              void handleCardClick(card.value);
            }}
          />
        </div>
      ) : (
        <EllipseTable
          state={gameState}
          config={
            gameRef.current?.config ||
            ({
              players: 4,
              turnSeconds: 15,
              maxCucumbers: 6,
              initialCards: 7,
              cpuLevel: 'normal',
            } as GameConfig)
          }
          currentPlayerIndex={currentPlayerIndex}
          onCardClick={(card: number) => handleCardClick(Number(card))}
          className={['cpu-play-table', isCardLocked ? 'cards-locked' : '']
            .filter(Boolean)
            .join(' ')}
          isSubmitting={isSubmitting}
          lockedCardId={lockedCardId}
          names={displayNames}
          mySeatIndex={0}
          trickCards={tableTrickCards}
          latestPlayedCardKey={latestPlayedKey}
          trickWinner={trickWinner}
          trickWinnerText={trickWinnerText}
          isFinalTrickMode={isFinalTrickPhase}
          finalTrickSelectedPlayers={finalTrickSelectedPlayers}
          finalTrickOpenedPlayers={finalTrickOpenedPlayers}
          finalTrickStatusText={finalTrickStatusText}
          showdownMode={isShowdownMode}
        />
      )}

      {marketSession ? (
        <section className="market-phase-overlay" aria-label="仕込み市場">
          <div className="market-phase-panel">
            <div className="market-phase-panel__header">
              <div>
                <p className="market-phase-panel__eyebrow">Round Setup</p>
                <h2>仕込み市場</h2>
              </div>
              <div className="market-phase-panel__meta">
                <span>{getMarketPhaseLabel(marketSession.state.phase)}</span>
                <strong>参加者+2枚</strong>
              </div>
            </div>

            <ol className="market-stepper" aria-label="市場フェーズの進行">
              {['提出', '公開', '取得', '開始'].map((label, index) => {
                const step = index + 1;
                return (
                  <li
                    key={label}
                    className={[
                      'market-stepper__item',
                      marketStep === step ? 'is-current' : '',
                      marketStep > step ? 'is-done' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span>{step}</span>
                    <strong>{label}</strong>
                  </li>
                );
              })}
            </ol>

            <p className="market-phase-panel__message" role="status" aria-live="polite">
              {marketSession.message}
            </p>

            <div className="market-phase-panel__body">
              <div className="market-phase-panel__main">
                <div className="market-zone market-zone--market">
                  <div className="market-zone__header">
                    <h3>市場</h3>
                    <span>
                      {canTakeMarketCard
                        ? '取得するカードを選択'
                        : `${marketSession.state.market.length}枚公開中`}
                    </span>
                  </div>
                  <div className="market-card-row market-card-row--market">
                    {marketSession.state.market.map((card, index) => (
                      <button
                        key={`market-${card}-${index}`}
                        type="button"
                        className={[
                          'market-card',
                          'market-card--market',
                          canTakeMarketCard ? 'is-takeable' : '',
                          card === 1 ? 'market-card--special' : '',
                          card === 15 ? 'market-card--danger' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        disabled={!canTakeMarketCard}
                        onClick={() => handleTakeMarketCard(card)}
                      >
                        <span>{card}</span>
                        <small>market</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="market-zone market-zone--hand">
                  <div className="market-zone__header">
                    <h3>あなたの手札</h3>
                    <span>
                      {marketSession.state.phase === 'Bidding'
                        ? '1枚を伏せて提出できます'
                        : humanBid === null
                          ? '交換しませんでした'
                          : `${humanBid}を除外済み`}
                    </span>
                  </div>
                  <div className="market-card-row market-card-row--hand">
                    {humanMarketHand.map((card, index) => {
                      const isSelected =
                        selectedMarketBid?.card === card && selectedMarketBid.index === index;
                      return (
                        <button
                          key={`bid-${card}-${index}`}
                          type="button"
                          className={[
                            'market-card',
                            'market-card--hand',
                            isSelected ? 'is-selected' : '',
                            card === 1 ? 'market-card--special' : '',
                            card === 15 ? 'market-card--danger' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          disabled={marketSession.state.phase !== 'Bidding'}
                          onClick={() => setSelectedMarketBid({ card, index })}
                        >
                          <span>{card}</span>
                          <small>{marketSession.state.phase === 'Bidding' ? 'bid' : 'hand'}</small>
                        </button>
                      );
                    })}
                  </div>

                  <div className="market-phase-panel__actions">
                    {marketSession.state.phase === 'Bidding' ? (
                      <>
                        <button
                          type="button"
                          className="market-action-button market-action-button--secondary"
                          onClick={() => handleSubmitMarketBid(null)}
                        >
                          交換しない
                        </button>
                        <button
                          type="button"
                          className="market-action-button"
                          disabled={selectedMarketBidCard === null}
                          onClick={() => handleSubmitMarketBid(selectedMarketBidCard)}
                        >
                          {selectedMarketBidCard === null
                            ? '提出カードを選択'
                            : `${selectedMarketBidCard}を伏せて提出`}
                        </button>
                      </>
                    ) : (
                      <button type="button" className="market-action-button" disabled>
                        {marketSession.state.phase === 'Choosing'
                          ? canTakeMarketCard
                            ? '市場カードを選択してください'
                            : '取得順を処理中'
                          : '通常対局へ移行中'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <aside className="market-phase-panel__side" aria-label="市場の状況">
                <div className="market-status-card">
                  <h3>現在</h3>
                  <strong>
                    {marketSession.state.phase === 'Choosing' && currentMarketTurn
                      ? `${getPlayerLabel(currentMarketTurn.player)}の取得順`
                      : getMarketPhaseLabel(marketSession.state.phase)}
                  </strong>
                  <p>
                    {marketSession.state.phase === 'Bidding'
                      ? selectedMarketBid === null
                        ? '出すカードを選ぶか、交換しないを選択します。'
                        : `${selectedMarketBidCard}を出す予定です。`
                      : marketSession.state.phase === 'Choosing'
                        ? currentMarketTurn
                          ? `提出カード ${currentMarketTurn.bidCard}。大きい順に市場から取ります。`
                          : '取得順を確認しています。'
                        : humanTake
                          ? `${humanBid}を出して${humanTake.card}を取得しました。`
                          : '市場交換が完了しました。'}
                  </p>
                </div>

                <div className="market-bid-list">
                  {marketSession.state.bids.map((bid, player) => {
                    const take = marketSession.takeDecisions.find(
                      decision => decision.player === player
                    );
                    const isCurrent = currentMarketPlayer === player;
                    return (
                      <div
                        key={`bid-result-${player}`}
                        className={[
                          'market-bid-list__item',
                          player === 0 ? 'is-self' : '',
                          isCurrent ? 'is-current' : '',
                          take ? 'is-taken' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <strong>{getPlayerLabel(player)}</strong>
                        <span>{getMarketBidText(bid)}</span>
                        <em>{take ? `${take.card}を取得` : isCurrent ? '取得中' : ''}</em>
                      </div>
                    );
                  })}
                </div>
              </aside>
            </div>
          </div>
        </section>
      ) : null}

      {overlayText ? (
        <div className="final-trick-overlay" role="status" aria-live="assertive">
          <div className="final-trick-overlay__text">{overlayText}</div>
        </div>
      ) : null}

      {gameOver ? (
        <div className="game-over-overlay">
          <div className="game-over-overlay__title">
            {gameResults
              .filter(result => result.eliminated)
              .map(result => result.name)
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

          <div className="game-over-overlay__actions">
            <button type="button" className="game-over-overlay__home" onClick={handleRestartGame}>
              もう一度遊ぶ
            </button>
            <button
              type="button"
              className="game-over-overlay__home game-over-overlay__home--secondary"
              onClick={handleBackToHome}
            >
              ホームへ戻る
            </button>
          </div>
        </div>
      ) : null}
    </BattleLayout>
  );
}

export default function CpuPlayPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CpuPlayContent />
    </Suspense>
  );
}
