'use client';

import BattleLayout from '@/components/BattleLayout';
import { BattleHud, EllipseTable, GameFooter, Timer } from '@/components/ui';
import { HumanController } from '@/lib/controllers/human';
import { delay, runAnimation } from '@/lib/animQueue';
import {
  applyMove,
  createGameView,
  createInitialState,
  GameConfig,
  GameState,
  getEffectiveTurnSeconds,
  getLegalMoves,
  calculateFinalTrickPenalty,
  determineTrickWinner,
  Move,
  PlayerController,
  RngState,
  SeededRng,
} from '@/lib/game-core';
import { createCpuTableFromUrlParams } from '@/lib/modes';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import './game.css';

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
  const [gameOverData, setGameOverData] = useState<{ player: number; count: number }[]>([]);
  const [isCardLocked, setIsCardLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockedCardId, setLockedCardId] = useState<number | null>(null);
  const [tableTrickCards, setTableTrickCards] = useState<Move[]>([]);
  const [latestPlayedKey, setLatestPlayedKey] = useState<string | null>(null);
  const [trickWinner, setTrickWinner] = useState<number | null>(null);
  const [trickWinnerText, setTrickWinnerText] = useState<string | null>(null);
  const [turnNotice, setTurnNotice] = useState<string | null>(null);
  const [finalTrickSelectedPlayers, setFinalTrickSelectedPlayers] = useState<number[]>([]);
  const [finalTrickOpenedPlayers, setFinalTrickOpenedPlayers] = useState<number[]>([]);
  const [finalTrickStatusText, setFinalTrickStatusText] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const cpuTurnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const scheduleCpuTurnRef = useRef<(() => void) | null>(null);
  const playCpuTurnRef = useRef<(() => Promise<void>) | null>(null);

  // ゲーム状態の保存キー
  const getGameStateKey = useCallback((params: URLSearchParams) => {
    const players = params.get('players') || '4';
    const turnSeconds = params.get('turnSeconds') || '15';
    const maxCucumbers = params.get('maxCucumbers') || '6';
    const cpuLevel = params.get('cpuLevel') || 'normal';
    return `cpu-game-state-${players}-${turnSeconds}-${maxCucumbers}-${cpuLevel}`;
  }, []);

  // CPU対戦のセーブデータをクリア（新規開始用）
  const clearCpuGameState = () => {
    try {
      const gameStateKey = getGameStateKey(searchParams);
      localStorage.removeItem(gameStateKey);
      console.log('[Game] CPU game state cleared for fresh start');
    } catch (error) {
      console.warn('[Game] Failed to clear CPU game state:', error);
    }
  };

  const scheduleCpuTurn = useCallback(() => {
    if (!gameRef.current || !gameState || isProcessingRef.current || isAnimating) return;

    const { state } = gameRef.current;

    // 条件チェック
    if (state.currentPlayer === 0 || gameOver || state.phase !== 'AwaitMove') {
      return;
    }

    // 既存のタイマーをクリア
    if (cpuTurnTimerRef.current) {
      clearTimeout(cpuTurnTimerRef.current);
      cpuTurnTimerRef.current = null;
    }

    console.log(`[CPU] Scheduling turn for player ${state.currentPlayer}`);

    // CPUの思考時間
    const thinkingTime = 600 + Math.random() * 400;
    cpuTurnTimerRef.current = setTimeout(() => {
      if (gameRef.current && !isProcessingRef.current && playCpuTurnRef.current) {
        void playCpuTurnRef.current();
      }
    }, thinkingTime);
  }, [gameState, gameOver, isAnimating]);

  // refを更新
  useEffect(() => {
    scheduleCpuTurnRef.current = scheduleCpuTurn;
  }, [scheduleCpuTurn]);

  const startGame = useCallback(async () => {
    try {
      const { config, controllers, humanController } = createCpuTableFromUrlParams(searchParams);
      const { SeededRng } = await import('@/lib/game-core');
      const rng = new SeededRng(config.seed);
      const state = createInitialState(config, rng);

      gameRef.current = { state, config, controllers, rng, humanController };
      setGameState(state);
      setGameOver(false);
      setGameOverData([]);
      setTableTrickCards([]);
      setLatestPlayedKey(null);
      setTrickWinner(null);
      setTrickWinnerText(null);
      setTurnNotice(null);
      setFinalTrickSelectedPlayers([]);
      setFinalTrickOpenedPlayers([]);
      setFinalTrickStatusText(null);
      setIsAnimating(false);

      console.log('[Game] New game started with', config.players, 'players');

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
  }, [searchParams]);

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
      console.log('[Game] Starting fresh game (from home/settings)');
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
              gameOverData: { player: number; count: number }[];
              timestamp: number;
            };
            const now = Date.now();
            const age = now - parsed.timestamp;

            // 5分以内のセーブデータのみ復元
            if (age < 5 * 60 * 1000) {
              console.log(
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
              setGameOverData(parsed.gameOverData || []);
              setTableTrickCards(state.trickCards || []);
              setLatestPlayedKey(null);
              setTrickWinner(null);
              setTrickWinnerText(null);
              setTurnNotice(null);
              setFinalTrickSelectedPlayers([]);
              setFinalTrickOpenedPlayers([]);
              setFinalTrickStatusText(null);
              setIsAnimating(false);

              console.log('[Game] State restored successfully with rebuilt controllers');
              return;
            } else {
              console.log('[Game] Saved state too old, starting fresh');
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
        console.log(
          `[CPU] Skipping turn - Player: ${currentPlayer}, Phase: ${state.phase}, GameOver: ${gameOver}`
        );
        return;
      }

      console.log(`[CPU] Executing turn for player ${currentPlayer}`);

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
        console.log(`[CPU] Playing move: ${move}`);
        await playMove(currentPlayer, move);
      } else {
        // フォールバック: 最初の合法手
        const fallbackMove = legalMoves[0];
        console.log(`[CPU] Using fallback move: ${fallbackMove}`);
        await playMove(currentPlayer, fallbackMove);
      }

      console.log(`[CPU] Turn completed for player ${currentPlayer}`);

      // ターン完了後、次のCPUターンをスケジューリング
      setTimeout(() => {
        if (gameRef.current && !gameOver) {
          const { state } = gameRef.current;
          if (state.currentPlayer !== 0 && state.phase === 'AwaitMove') {
            console.log(`[CPU] Auto-scheduling next turn for player ${state.currentPlayer}`);
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
      console.log(`[CPU] Processing flag cleared`);
    }
  };

  useEffect(() => {
    playCpuTurnRef.current = playCpuTurn;
  });

  const playMove = async (player: number, card: number) => {
    if (!gameRef.current) return;

    console.log(`[PlayMove] Starting move - Player: ${player}, Card: ${card}`);

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
        const move: Move = { player, card, timestamp: Date.now(), isDiscard: isDiscardMove };
        const trickCardsAfterPlay = isDiscardMove ? [...state.trickCards] : [...state.trickCards, move];
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
        setLatestPlayedKey(`${player}-${move.timestamp}`);
        setTrickWinner(null);
        setTrickWinnerText(null);

        if (isFinalTrickMode) {
          setFinalTrickSelectedPlayers(prev => (prev.includes(player) ? prev : [...prev, player]));
          setFinalTrickStatusText('最終トリック: 全員の選択を待っています…');
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

          if (isFinalTrickMode) {
            setFinalTrickStatusText('オープン！');
            await delay(700);

            const revealOrder = Array.from({ length: config.players }, (_, idx) => (state.firstPlayer + idx) % config.players);
            for (const revealPlayer of revealOrder) {
              setFinalTrickOpenedPlayers(prev => (prev.includes(revealPlayer) ? prev : [...prev, revealPlayer]));
              const opened = trickCardsAfterPlay.find(tc => tc.player === revealPlayer);
              if (opened) {
                setLatestPlayedKey(`${opened.player}-${opened.timestamp}`);
              }
              await delay(650);
            }
          } else {
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
              const penaltyText = `${winnerName}が${penaltyResult.penalty}本のきゅうりを獲得しました`;
              setTrickWinnerText(hasOne ? `${penaltyText}（1が場にあるため2倍！）` : penaltyText);
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
          setIsAnimating(false);
        } else {
          gameRef.current.state = newState;
          setGameState(newState);
        }

        if (newState.phase === 'GameEnd') {
          setGameOver(true);
          setGameOverData(newState.players.map((p, index) => ({ player: index, count: p.cucumbers })));
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
    if (gameState && !gameOver && !isProcessingRef.current && !isAnimating && gameRef.current) {
      const { state } = gameRef.current;
      if (state.currentPlayer !== 0 && state.phase === 'AwaitMove') {
        console.log(`[useEffect] Scheduling CPU turn for player ${state.currentPlayer}`);
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
  }, [gameState?.currentPlayer, gameState?.phase, gameOver, isAnimating]);

  const handleCardClick = async (card: number) => {
    if (!gameRef.current || isCardLocked || isSubmitting || isProcessingRef.current || isAnimating)
      return;

    const { state } = gameRef.current;

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
    if (!gameRef.current || gameState?.currentPlayer !== 0 || isProcessingRef.current || isAnimating)
      return;

    console.log('[Timeout] Handling timeout for player 0');

    // 制限時間切れ時のランダムカード選択
    const legalMoves = getLegalMoves(gameState, 0);
    if (legalMoves.length > 0) {
      const randomIndex = Math.floor(Math.random() * legalMoves.length);
      const selectedCard = legalMoves[randomIndex];
      console.log(
        `[Timeout] Auto-selecting random card: ${selectedCard} from legal moves:`,
        legalMoves
      );
      await handleCardClick(selectedCard);
    } else {
      const hand = gameState.players[0].hand;
      if (hand.length > 0) {
        const minCard = Math.min(...hand);
        console.log(`[Timeout] No legal moves, selecting minimum card: ${minCard}`);
        await handleCardClick(minCard);
      }
    }
  };

  const handleRestart = () => {
    const gameStateKey = getGameStateKey(searchParams);
    localStorage.removeItem(gameStateKey);
    router.push('/cucumber/cpu/settings');
  };

  const handleBackToHome = () => {
    // ゲーム状態をクリア
    const gameStateKey = getGameStateKey(searchParams);
    localStorage.removeItem(gameStateKey);
    router.push('/home');
  };

  if (!gameState) {
    return (
      <BattleLayout showOrientationHint>
        <div className="flex-1 flex flex-col p-4">
          <div className="grid place-items-center h-full text-white/80">Loading...</div>
        </div>
      </BattleLayout>
    );
  }

  const displayNames = gameState.players.map((_, idx) => (idx === 0 ? 'あなた' : `CPU ${idx}`));
  const humanLegalMoves = getLegalMoves(gameState, 0);
  const shouldDiscardMinCard =
    gameState.currentPlayer === 0 &&
    gameState.phase === 'AwaitMove' &&
    gameState.fieldCard !== null &&
    humanLegalMoves.length === 1 &&
    humanLegalMoves[0] < gameState.fieldCard;

  const currentPlayerIndex = isAnimating ? null : gameState.currentPlayer;

  return (
    <BattleLayout showOrientationHint>
      <div className="relative flex-1 flex flex-col gap-6 p-4">
        <div
          key={`${gameState.currentRound}-${gameState.currentTrick}`}
          className="trick-indicator-update"
          style={{
            position: 'absolute',
            top: '1rem',
            left: '1.5rem',
            zIndex: 10,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            padding: '0.5rem 1.2rem',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
          }}
        >
          第{gameState.currentRound}ラウンド / 第{gameState.currentTrick}トリック
        </div>
        <BattleHud
          round={gameState.currentRound}
          trick={gameState.currentTrick}
          timer={
            <Timer
              turnSeconds={gameRef.current ? getEffectiveTurnSeconds(gameRef.current.config) : null}
              isActive={gameState.currentPlayer === 0 && gameState.phase === 'AwaitMove'}
              onTimeout={handleTimeout}
            />
          }
          onExit={handleBackToHome}
        />

        {gameState.currentTrick === (gameRef.current?.config?.initialCards || 7) ? (
          <div className="final-trick-notice" role="status" aria-live="polite">
            最終トリック
          </div>
        ) : null}

        {shouldDiscardMinCard ? (
          <div className="discard-notice" role="status" aria-live="polite">
            出せるカードがありません。最小のカードを捨てます。
          </div>
        ) : null}

        {turnNotice ? (
          <div className="discard-result-notice" role="status" aria-live="polite">
            {turnNotice}
          </div>
        ) : null}
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
          className={isCardLocked ? 'cards-locked' : ''}
          isSubmitting={isSubmitting}
          lockedCardId={lockedCardId}
          names={displayNames}
          mySeatIndex={0}
          trickCards={tableTrickCards}
          latestPlayedCardKey={latestPlayedKey}
          trickWinner={trickWinner}
          trickWinnerText={trickWinnerText}
          isFinalTrickMode={gameState.isFinalTrick || gameState.currentTrick === (gameRef.current?.config?.initialCards || 7)}
          finalTrickSelectedPlayers={finalTrickSelectedPlayers}
          finalTrickOpenedPlayers={finalTrickOpenedPlayers}
          finalTrickStatusText={finalTrickStatusText}
        />

        {gameOver ? (
          <GameFooter>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-heading text-[clamp(18px,2.2vw,24px)]">ゲーム終了</h2>
              <div className="flex flex-wrap gap-2 text-white/80 text-sm">
                {gameOverData.map((data, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1"
                  >
                    プレイヤー{data.player}: {data.count}個
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleRestart}
                className="fc-button fc-button--primary"
              >
                再戦
              </button>
              <button
                type="button"
                onClick={handleBackToHome}
                className="fc-button fc-button--secondary"
              >
                ホーム
              </button>
            </div>
          </GameFooter>
        ) : null}
      </div>
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
