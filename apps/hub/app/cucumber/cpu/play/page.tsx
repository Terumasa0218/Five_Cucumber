'use client';

import { EllipseTable, Timer } from '@/components/ui';
import { delay, runAnimation } from '@/lib/animQueue';
import {
    applyMove,
    createGameView,
    createInitialState,
    endTrick,
    finalRound,
    GameConfig,
    GameState,
    getEffectiveTurnSeconds,
    getLegalMoves,
    getMinResolveMs,
    Move,
    PlayerController,
    SeededRng,
    startNewRound
} from '@/lib/game-core';
import { createCpuTableFromUrlParams } from '@/lib/modes';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import './game.css';

function CpuPlayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameRef = useRef<{
    state: GameState;
    config: GameConfig;
    controllers: PlayerController[];
    rng: SeededRng;
    humanController: any;
  } | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverData, setGameOverData] = useState<{ player: number; count: number }[]>([]);
  const [isCardLocked, setIsCardLocked] = useState(false);
  const [showAllHands, setShowAllHands] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockedCardId, setLockedCardId] = useState<number | null>(null);
  
  // ゲーム状態の保存キー
  const getGameStateKey = (params: URLSearchParams) => {
    const players = params.get('players') || '4';
    const turnSeconds = params.get('turnSeconds') || '15';
    const maxCucumbers = params.get('maxCucumbers') || '6';
    const cpuLevel = params.get('cpuLevel') || 'normal';
    return `cpu-game-state-${players}-${turnSeconds}-${maxCucumbers}-${cpuLevel}`;
  };
  
  // ゲーム状態を保存
  const saveGameState = () => {
    if (!gameRef.current || !gameState) return;
    
    try {
      const gameStateKey = getGameStateKey(searchParams);
      const saveData = {
        gameRef: {
          ...gameRef.current,
          rng: gameRef.current.rng.getState()
        },
        gameState,
        gameOver,
        gameOverData
      };
      localStorage.setItem(gameStateKey, JSON.stringify(saveData));
      console.log('[Game] State saved');
    } catch (error) {
      console.warn('[Game] Failed to save state:', error);
    }
  };

  useEffect(() => {
    document.title = 'CPU対戦 | Five Cucumber';
    
    // デバッグモードの設定
    const showAllHandsParam = searchParams.get('showAllHands');
    setShowAllHands(showAllHandsParam === 'true');
    
    const gameStateKey = getGameStateKey(searchParams);
    
    // 保存されたゲーム状態を復元を試みる
    try {
      const savedGameData = localStorage.getItem(gameStateKey);
      if (savedGameData && savedGameData.trim()) {
        const parsedData = JSON.parse(savedGameData);
        const { gameRef: savedGameRef, gameState: savedGameState, gameOver: savedGameOver, gameOverData: savedGameOverData } = parsedData;
        
        // 復元データの検証
        if (savedGameRef && savedGameState && 
            savedGameState.players && Array.isArray(savedGameState.players) &&
            typeof savedGameState.currentPlayer === 'number' &&
            typeof savedGameState.phase === 'string') {
          
          console.log('[Game] Restoring validated saved game state');
          
          // 新しいテーブル設定を作成（復元用）
          const table = createCpuTableFromUrlParams(searchParams);
          const rng = new SeededRng();
          
          // RNG状態の復元（安全に）
          try {
            if (savedGameRef.rng && typeof savedGameRef.rng === 'object') {
              rng.setState(savedGameRef.rng);
            }
          } catch (rngError) {
            console.warn('[Game] Failed to restore RNG state:', rngError);
          }
          
          // 最小ペース制御の設定
          table.config.minTurnMs = 500;
          table.config.minResolveMs = 600;
          
          // ゲーム参照を安全に再構築
          gameRef.current = {
            state: savedGameState,
            config: table.config,
            controllers: table.controllers,
            rng,
            humanController: table.humanController
          };
          
          setGameState(savedGameState);
          setGameOver(savedGameOver || false);
          setGameOverData(savedGameOverData || []);
          
          console.log('[Game] Game state restored successfully');
          return;
        } else {
          console.warn('[Game] Invalid saved game data structure');
          localStorage.removeItem(gameStateKey);
        }
      }
    } catch (error) {
      console.warn('[Game] Failed to restore saved state:', error);
      // 破損したデータを削除
      try {
        localStorage.removeItem(gameStateKey);
      } catch (cleanupError) {
        console.error('[Game] Failed to cleanup corrupted data:', cleanupError);
      }
    }
    
    // 新しいゲームを開始
    console.log('[Game] Starting new game');
    const table = createCpuTableFromUrlParams(searchParams);
    const rng = new SeededRng(table.config.seed);
    
    // 最小ペース制御の設定
    table.config.minTurnMs = 500;
    table.config.minResolveMs = 600;
    
    // 初期状態を作成
    const initialState = createInitialState(table.config, rng);
    
    gameRef.current = {
      state: initialState,
      config: table.config,
      controllers: table.controllers,
      rng,
      humanController: table.humanController
    };
    
    setGameState(initialState);
    
    // ゲーム開始
    startGame();
    
    return () => {
      // クリーンアップ
    };
  }, [searchParams]);
  
  // ゲーム状態変更時の自動保存
  useEffect(() => {
    if (gameState) {
      saveGameState();
    }
  }, [gameState, gameOver, gameOverData]);

  const startGame = async () => {
    if (!gameRef.current) return;
    
    const { state, config, controllers, rng, humanController } = gameRef.current;
    
    // 最初のプレイヤーがCPUの場合は自動プレイ（ゆっくり待つ）
    if (state.currentPlayer !== 0) {
      setTimeout(() => playCpuTurn(), 4000);
    }
  };

  const playCpuTurn = async () => {
    if (!gameRef.current || gameOver) return;
    
    const { state, config, controllers, rng } = gameRef.current;
    const currentPlayer = state.currentPlayer;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CPU Turn] Current player: ${currentPlayer}, Phase: ${state.phase}, GameOver: ${gameOver}`);
    }
    
    if (currentPlayer === 0) return; // 人間のターン
    if (state.phase !== "AwaitMove") return; // 適切なフェーズでない
    
    const controller = controllers[currentPlayer];
    if (!controller) {
      console.error(`[CPU ${currentPlayer}] Controller not found!`);
      return;
    }
    
    const hand = state.players[currentPlayer]?.hand;
    const legalMoves = getLegalMoves(state, currentPlayer);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CPU ${currentPlayer}] Hand:`, hand, 'Legal moves:', legalMoves, 'Field card:', state.fieldCard);
    }
    
    const view = createGameView(state, config, currentPlayer);
    
    try {
      const move = await controller.onYourTurn(view);
      if (move !== null && typeof move === 'number') {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[CPU ${currentPlayer}] Selected move:`, move);
        }
        
        // 合法性を再確認
        if (!legalMoves.includes(move)) {
          console.error(`[CPU ${currentPlayer}] Selected illegal move:`, move, 'Legal moves:', legalMoves);
          // 最初の合法手を使用
          const fallbackMove = legalMoves[0];
          if (fallbackMove !== undefined) {
            console.log(`[CPU ${currentPlayer}] Using first legal move:`, fallbackMove);
            await playMove(currentPlayer, fallbackMove);
          }
          return;
        }
        
        await playMove(currentPlayer, move);
    } else {
        console.warn(`[CPU ${currentPlayer}] No valid move returned:`, move);
        // フォールバック：最初の合法手を出す
        if (legalMoves.length > 0) {
          const fallbackMove = legalMoves[0];
          console.log(`[CPU ${currentPlayer}] Using fallback legal move:`, fallbackMove);
          await playMove(currentPlayer, fallbackMove);
        }
      }
    } catch (error) {
      console.error(`[CPU ${currentPlayer}] Turn error:`, error);
      // エラー時のフォールバック処理
      if (legalMoves.length > 0) {
        const fallbackMove = legalMoves[0];
        console.log(`[CPU ${currentPlayer}] Error fallback legal move:`, fallbackMove);
        await playMove(currentPlayer, fallbackMove);
      }
    }
  };

  // CPU手番の処理をuseEffectで分離
  useEffect(() => {
    // 早期リターンでHooksの条件呼び出しを防ぐ
    if (!gameState) return;
    if (gameState.currentPlayer === 0) return;
    if (gameOver) return;
    if (gameState.phase !== "AwaitMove") return;
    
    // CPUの思考時間をさらに長めに設定（3〜6秒のランダム）
    const thinkingTime = 3000 + Math.random() * 3000;
    const timer = setTimeout(() => {
      // 実行時点での最新状態を再確認
      if (!gameRef.current) return;
      if (gameOver) return;
      
      const currentState = gameRef.current.state;
      if (currentState.currentPlayer !== 0 && currentState.phase === "AwaitMove") {
        playCpuTurn().catch(error => {
          console.error('[CPU Turn Error]:', error);
        });
      }
    }, thinkingTime);
    
    return () => {
      clearTimeout(timer);
    };
  }, [gameState?.currentPlayer, gameState?.phase, gameOver]);

  const playMove = async (player: number, card: number) => {
    // 基本的な前提条件チェック
    if (!gameRef.current) {
      console.warn('[PlayMove] No game reference');
      return;
    }
    if (gameOver) {
      console.warn('[PlayMove] Game is over');
      return;
    }
    
    try {
      await runAnimation(async () => {
        // 実行時点での最新状態を取得
        if (!gameRef.current) {
          console.error('[PlayMove] Game reference lost during execution');
          return;
        }
        
        const { state, config, controllers, rng } = gameRef.current;
        
        // 厳密な状態チェック
        if (state.phase !== "AwaitMove") {
          console.warn(`[PlayMove] Invalid phase: ${state.phase}`);
          return;
        }
        
        if (state.currentPlayer !== player) {
          console.warn(`[PlayMove] Wrong player: ${player}, expected: ${state.currentPlayer}`);
          return;
        }
        
        // 手札の存在確認
        const playerHand = state.players[player]?.hand;
        if (!playerHand || !playerHand.includes(card)) {
          console.error(`[PlayMove] Card ${card} not in player ${player} hand:`, playerHand);
          return;
        }
        
        const move: Move = { player, card, timestamp: Date.now() };
        if (process.env.NODE_ENV === 'development') {
          console.log(`[PlayMove] Player ${player} playing card ${card}, Phase: ${state.phase}`);
        }
        
        const result = applyMove(state, move, config, rng);
        if (!result.success) {
          console.error(`[PlayMove] Invalid move by player ${player}:`, result.message || 'Unknown error');
          console.error(`[PlayMove] Hand:`, playerHand, `Field card:`, state.fieldCard);
          return;
        }

        let newState = result.newState;
        
        // 状態更新（同期的に実行）
        if (!gameRef.current) {
          console.error('[PlayMove] Game reference lost during state update');
          return;
        }
        
        gameRef.current.state = newState;
        setGameState(newState);
        
        // 最小ターン時間の待機
        const minTurnMs = config.minTurnMs || 500;
        await delay(minTurnMs);
        
        // トリック解決フェーズの処理
        if (newState.phase === "ResolvingTrick") {
          const trickResult = endTrick(newState, config, rng);
          if (trickResult.success) {
            newState = trickResult.newState;
            
            // 解決時間の待機
            const minResolveMs = getMinResolveMs(config);
            await delay(minResolveMs);
            
            // 最終トリック処理
            if (newState.phase === "RoundEnd") {
              const finalResult = finalRound(newState, config, rng);
              if (finalResult.success) {
                newState = finalResult.newState;
                
                if (newState.phase === "GameEnd") {
                  // ゲーム終了処理
                  setGameOverData(newState.gameOverPlayers.map(p => ({ 
                    player: p, 
                    count: newState.players[p].cucumbers 
                  })));
                  setGameOver(true);
                  if (gameRef.current) {
                    gameRef.current.state = newState;
                  }
                  setGameState(newState);
                  return;
                }
                
                // 次のラウンド
                const roundResult = startNewRound(newState, config, rng);
                if (roundResult.success) {
                  newState = roundResult.newState;
                }
              }
            }
          }
        }
        
        // 最終的な状態更新
        if (gameRef.current) {
          gameRef.current.state = newState;
          setGameState(newState);
        }
      });
    } catch (error) {
      console.error(`[PlayMove] Critical error for player ${player}:`, error);
      
      // 包括的なエラー復旧処理
      try {
        if (!gameRef.current) {
          console.error('[Recovery] No game reference available');
          return;
        }
        
        if (gameOver) {
          console.log('[Recovery] Game is over, no recovery needed');
          return;
        }
        
        const { state, config } = gameRef.current;
        console.log(`[Recovery] Attempting recovery - Player: ${state.currentPlayer}, Phase: ${state.phase}`);
        
        // 状態の整合性チェックと修正
        let recoveredState = { ...state };
        let needsRecovery = false;
        
        // フェーズの修正
        if (recoveredState.phase !== "AwaitMove" && recoveredState.phase !== "GameEnd") {
          console.log(`[Recovery] Invalid phase ${recoveredState.phase}, resetting to AwaitMove`);
          recoveredState.phase = "AwaitMove";
          needsRecovery = true;
        }
        
        // プレイヤーインデックスの修正
        if (recoveredState.currentPlayer < 0 || recoveredState.currentPlayer >= config.players) {
          console.log(`[Recovery] Invalid currentPlayer ${recoveredState.currentPlayer}, resetting to 0`);
          recoveredState.currentPlayer = 0;
          needsRecovery = true;
        }
        
        // 状態を復旧
        if (needsRecovery) {
          gameRef.current.state = recoveredState;
          setGameState(recoveredState);
          console.log('[Recovery] State recovered successfully');
        }
        
        // CPUターンの継続判定
        if (recoveredState.phase === "AwaitMove" && recoveredState.currentPlayer !== 0) {
          console.log('[Recovery] Scheduling CPU turn continuation');
          setTimeout(() => {
            if (gameRef.current && !gameOver) {
              const currentState = gameRef.current.state;
              if (currentState.phase === "AwaitMove" && currentState.currentPlayer !== 0) {
                console.log('[Recovery] Executing CPU turn continuation');
                playCpuTurn().catch(recoveryError => {
                  console.error('[Recovery] Failed to continue CPU turn:', recoveryError);
                });
              }
            }
          }, 4000); // 4秒待機で確実に復旧
        }
        
      } catch (recoveryError) {
        console.error('[Recovery] Recovery process failed:', recoveryError);
      }
    }
  };

  const handleCardClick = (card: number) => {
    if (!gameRef.current || isCardLocked || isSubmitting) return;
    
    const { state, humanController } = gameRef.current;
    
    if (state.currentPlayer === 0 && state.phase === 'AwaitMove') {
      // カードを即座にロック
      setIsSubmitting(true);
      setLockedCardId(card);
      setIsCardLocked(true);
      
      try {
        humanController.playCard(card);
        playMove(0, card);
        
        // 2秒後にカードロックを解除
    setTimeout(() => {
          setIsCardLocked(false);
          setIsSubmitting(false);
          setLockedCardId(null);
        }, 2000);
      } catch (error) {
        // エラー時は状態をリセット
        setIsSubmitting(false);
        setLockedCardId(null);
        setIsCardLocked(false);
        console.error('Card play error:', error);
      }
    }
  };

  const handleTimeout = () => {
    if (!gameRef.current || gameState?.currentPlayer !== 0) return;
    
    // 自動プレイ
    const legalMoves = gameState.players[0].hand;
    if (legalMoves.length > 0) {
      const minCard = Math.min(...legalMoves);
      handleCardClick(minCard);
    }
  };

  const handleRestart = () => {
    setGameOver(false);
    setGameOverData([]);
    router.push('/cucumber/cpu/settings');
  };

  const handleBackToHome = () => {
    router.push('/home');
  };

  if (!gameState) {
    return <div className="game-root">Loading...</div>;
  }

  return (
    <div className="page-arena">
      <div className="game-root">
        <div className="game-container">
        <header className="hud layer-hud">
        <div className="hud-left">
            <div className="round-indicator" id="roundInfo">
              第{gameState.currentRound}回戦 / 第{gameState.currentTrick}トリック
          </div>
        </div>
        
        <div className="hud-center">
          {gameState.currentPlayer === 0 && gameState.phase === "AwaitMove" && (
            <Timer
              turnSeconds={gameRef.current ? getEffectiveTurnSeconds(gameRef.current.config) : null}
              isActive={true}
              onTimeout={handleTimeout}
            />
          )}
        </div>
        
        <div className="hud-right">
          <button
            onClick={handleBackToHome}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            ホーム
          </button>
        </div>
        </header>

        <EllipseTable
          state={gameState}
          config={gameRef.current?.config || {} as GameConfig}
          currentPlayerIndex={gameState.currentPlayer}
          onCardClick={handleCardClick}
          className={isCardLocked ? 'cards-locked' : ''}
          showAllHands={showAllHands}
          isSubmitting={isSubmitting}
          lockedCardId={lockedCardId}
        />
      </div>

      {gameOver && (
        <div className="game-over">
          <div className="game-over-content">
            <div className="game-over-title">
              {gameOverData.map(l => ['あなた', 'CPU-A', 'CPU-B', 'CPU-C', 'CPU-D', 'CPU-E'][l.player]).join('、')} お漬物！！
            </div>
            <div>
              <p>ゲーム終了です</p>
              <p>最終結果:</p>
              {gameOverData.map((l, i) => (
                <p key={i}>
                  {['あなた', 'CPU-A', 'CPU-B', 'CPU-C', 'CPU-D', 'CPU-E'][l.player]}: {l.count}本
                </p>
              ))}
            </div>
            <button className="restart-btn" onClick={handleRestart}>
              もう一度プレイ
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function CpuPlay() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CpuPlayContent />
    </Suspense>
  );
}

