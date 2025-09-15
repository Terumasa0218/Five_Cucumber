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
  const cpuTurnTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // ゲーム状態の保存キー
  const getGameStateKey = (params: URLSearchParams) => {
    const players = params.get('players') || '4';
    const turnSeconds = params.get('turnSeconds') || '15';
    const maxCucumbers = params.get('maxCucumbers') || '6';
    const cpuLevel = params.get('cpuLevel') || 'normal';
    return `cpu-game-state-${players}-${turnSeconds}-${maxCucumbers}-${cpuLevel}`;
  };
  
  // ゲーム状態を保存（リロード時の復元用のみ）
  let saveGameState = () => {
    if (!gameRef.current || !gameState) return;
    
    // CPU処理中は保存をスキップ
    if (cpuTurnTimerRef.current) {
      return;
    }
    
    try {
      const gameStateKey = getGameStateKey(searchParams);
      const saveData = {
        gameRef: {
          ...gameRef.current,
          rng: gameRef.current.rng.getState()
        },
        gameState,
        gameOver,
        gameOverData,
        timestamp: Date.now() // タイムスタンプを追加
      };
      localStorage.setItem(gameStateKey, JSON.stringify(saveData));
      console.log('[Game] State saved for reload recovery');
    } catch (error) {
      console.warn('[Game] Failed to save state:', error);
    }
  };
  
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

  useEffect(() => {
    document.title = 'CPU対戦 | Five Cucumber';
    
    // デバッグモードの設定
    const showAllHandsParam = searchParams.get('showAllHands');
    setShowAllHands(showAllHandsParam === 'true');
    
    // リファラーをチェックして新規開始かリロード復元かを判定
    const isFromHome = document.referrer.includes('/home') || document.referrer.includes('/cpu/settings') || !document.referrer;
    const gameStateKey = getGameStateKey(searchParams);
    
    // ホームから来た場合は常に新規ゲーム開始
    if (isFromHome) {
      console.log('[Game] Starting fresh game (from home/settings)');
      clearCpuGameState();
    } else {
      console.log('[Game] Attempting to restore game state (from reload)');
    }
    
    // 保存されたゲーム状態を復元を試みる（リロード時のみ）
    if (!isFromHome) {
      try {
        const savedGameData = localStorage.getItem(gameStateKey);
        if (savedGameData && savedGameData.trim()) {
          const parsedData = JSON.parse(savedGameData);
          const { gameRef: savedGameRef, gameState: savedGameState, gameOver: savedGameOver, gameOverData: savedGameOverData, timestamp } = parsedData;
          
          // タイムスタンプチェック（5分以内のデータのみ復元）
          const now = Date.now();
          const maxAge = 5 * 60 * 1000; // 5分
          if (timestamp && (now - timestamp) > maxAge) {
            console.log('[Game] Saved data too old, starting fresh game');
            localStorage.removeItem(gameStateKey);
          } else if (savedGameRef && savedGameState && 
              savedGameState.players && Array.isArray(savedGameState.players) &&
              typeof savedGameState.currentPlayer === 'number' &&
              typeof savedGameState.phase === 'string') {
            
            // さらに詳細な検証
            const playersParam = parseInt(searchParams.get('players') || '4');
            const isValidCurrentPlayer = savedGameState.currentPlayer >= 0 && savedGameState.currentPlayer < playersParam;
            const isValidPhase = ['AwaitMove', 'ResolvingTrick', 'RoundEnd', 'GameEnd'].includes(savedGameState.phase);
            const hasValidPlayers = savedGameState.players.length === playersParam;
            
            if (!isValidCurrentPlayer) {
              console.warn(`[Game] Invalid currentPlayer in saved state: ${savedGameState.currentPlayer}, expected 0-${playersParam-1}`);
              localStorage.removeItem(gameStateKey);
            } else if (!isValidPhase) {
              console.warn(`[Game] Invalid phase in saved state: ${savedGameState.phase}`);
              localStorage.removeItem(gameStateKey);
            } else if (!hasValidPlayers) {
              console.warn(`[Game] Invalid players count in saved state: ${savedGameState.players.length}, expected ${playersParam}`);
              localStorage.removeItem(gameStateKey);
            } else {
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
            }
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
  
  // ゲーム状態変更時の自動保存（CPU処理中は除外）
  useEffect(() => {
    if (gameState && !cpuTurnTimerRef.current) {
      // CPU思考中でない場合のみ保存
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
    if (!gameRef.current) {
      console.warn('[CPU Turn] No game reference');
      cpuTurnTimerRef.current = null;
      return;
    }
    if (gameOver) {
      console.warn('[CPU Turn] Game is over');
      cpuTurnTimerRef.current = null;
      return;
    }
    
    const { state, config, controllers, rng } = gameRef.current;
    const currentPlayer = state.currentPlayer;
    
    // 詳細な状態ログ
    console.log(`[CPU Turn] Starting - Player: ${currentPlayer}, Phase: ${state.phase}, Round: ${state.currentRound}, Trick: ${state.currentTrick}`);
    console.log(`[CPU Turn] Trick cards: ${state.trickCards.length}/${config.players}, GameOver: ${gameOver}`);
    
    // 厳密な前提条件チェック
    if (currentPlayer === 0) {
      console.log('[CPU Turn] Human player turn, skipping');
      cpuTurnTimerRef.current = null;
      return;
    }
    
    if (state.phase !== "AwaitMove") {
      console.warn(`[CPU Turn] Invalid phase: ${state.phase}`);
      cpuTurnTimerRef.current = null;
      return;
    }
    
    // プレイヤー番号の妥当性チェック
    if (currentPlayer < 0 || currentPlayer >= config.players) {
      console.error(`[CPU Turn] Invalid currentPlayer: ${currentPlayer}, valid range: 0-${config.players - 1}`);
      cpuTurnTimerRef.current = null;
      return;
    }
    
    const controller = controllers[currentPlayer];
    if (!controller) {
      console.error(`[CPU ${currentPlayer}] Controller not found!`);
      cpuTurnTimerRef.current = null;
      return;
    }
    
    const hand = state.players[currentPlayer]?.hand;
    const legalMoves = getLegalMoves(state, currentPlayer);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CPU ${currentPlayer}] Hand:`, hand, 'Legal moves:', legalMoves, 'Field card:', state.fieldCard);
    }
    
    // 合法手がない場合はスキップ
    if (legalMoves.length === 0) {
      console.warn(`[CPU ${currentPlayer}] No legal moves available`);
      cpuTurnTimerRef.current = null;
      return;
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
          cpuTurnTimerRef.current = null;
          return;
        }
        
        await playMove(currentPlayer, move);
        cpuTurnTimerRef.current = null;
    } else {
        console.warn(`[CPU ${currentPlayer}] No valid move returned:`, move);
        // フォールバック：最初の合法手を出す
        const fallbackMove = legalMoves[0];
        console.log(`[CPU ${currentPlayer}] Using fallback legal move:`, fallbackMove);
        await playMove(currentPlayer, fallbackMove);
        cpuTurnTimerRef.current = null;
      }
    } catch (error) {
      console.error(`[CPU ${currentPlayer}] Turn error:`, error);
      // エラー時のフォールバック処理
      const fallbackMove = legalMoves[0];
      console.log(`[CPU ${currentPlayer}] Error fallback legal move:`, fallbackMove);
      await playMove(currentPlayer, fallbackMove);
      cpuTurnTimerRef.current = null;
    }
  };

  // CPU手番の処理をuseEffectで分離
  useEffect(() => {
    // 既存のタイマーをクリア
    if (cpuTurnTimerRef.current) {
      clearTimeout(cpuTurnTimerRef.current);
      cpuTurnTimerRef.current = null;
    }
    
    // 条件チェックを統合してHooksの条件呼び出しを防ぐ
    const shouldScheduleCpuTurn = gameState && 
      gameState.currentPlayer !== 0 && 
      !gameOver && 
      gameState.phase === "AwaitMove" &&
      gameRef.current &&
      gameState.currentPlayer >= 0 && 
      gameState.currentPlayer < (gameRef.current.config?.players || 4);
    
    if (!shouldScheduleCpuTurn) {
      if (!gameState) {
        console.log('[useEffect] No game state');
      } else if (gameState.currentPlayer === 0) {
        console.log('[useEffect] Human player turn');
      } else if (gameOver) {
        console.log('[useEffect] Game is over');
      } else if (gameState.phase !== "AwaitMove") {
        console.log(`[useEffect] Invalid phase: ${gameState.phase}`);
      } else if (!gameRef.current) {
        console.warn('[useEffect] No game reference');
      } else {
        console.error(`[useEffect] Invalid currentPlayer: ${gameState.currentPlayer}`);
      }
      return;
    }
    
    console.log(`[useEffect] Scheduling CPU turn for player ${gameState.currentPlayer}`);
    
    // CPUの思考時間を適度に設定（2〜4秒のランダム）
    const thinkingTime = 2000 + Math.random() * 2000;
    cpuTurnTimerRef.current = setTimeout(() => {
      // 実行時点での最新状態を再確認
      if (!gameRef.current || gameOver) {
        console.warn('[CPU Turn] Game state changed, skipping turn');
        cpuTurnTimerRef.current = null;
        return;
      }
      
      // gameStateと一致するかチェック
      const currentState = gameRef.current.state;
      if (currentState.currentPlayer === gameState.currentPlayer && 
          currentState.phase === "AwaitMove" && 
          currentState.currentPlayer !== 0) {
        // CPU処理開始前に状態保存を一時停止
        const originalSaveGameState = saveGameState;
        saveGameState = () => {}; // 一時的に無効化
        
        playCpuTurn().catch(error => {
          console.error('[CPU Turn Error]:', error);
        }).finally(() => {
          // CPU処理完了後に状態保存を復元
          saveGameState = originalSaveGameState;
          cpuTurnTimerRef.current = null;
          console.log(`[CPU Turn] Completed for player ${currentState.currentPlayer}`);
        });
      } else {
        console.warn(`[CPU Turn] State mismatch - skipping turn for player ${gameState.currentPlayer}`);
        cpuTurnTimerRef.current = null;
      }
    }, thinkingTime);
    
    return () => {
      if (cpuTurnTimerRef.current) {
        clearTimeout(cpuTurnTimerRef.current);
        cpuTurnTimerRef.current = null;
      }
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

        // プレイヤー番号の詳細検証
        if (state.currentPlayer !== player) {
          console.error(`[PlayMove] Player mismatch detected:`);
          console.error(`  - Requested player: ${player}`);
          console.error(`  - Current player: ${state.currentPlayer}`);
          console.error(`  - Game phase: ${state.phase}`);
          console.error(`  - Trick cards: ${state.trickCards.length}`);
          console.error(`  - Round: ${state.currentRound}, Trick: ${state.currentTrick}`);
          
          // プレイヤーミスマッチの場合は状態を修正して続行
          console.warn(`[PlayMove] Correcting player mismatch: ${player} -> ${state.currentPlayer}`);
          // 状態を修正して正しいプレイヤーで続行
          const correctedState = { ...state, currentPlayer: player };
          gameRef.current.state = correctedState;
          setGameState(correctedState);
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
        
        // トリック状態の整合性チェック
        if (recoveredState.trickCards.length >= config.players) {
          console.log(`[Recovery] Trick complete but not resolved, clearing trick cards`);
          recoveredState.trickCards = [];
          recoveredState.fieldCard = null;
          needsRecovery = true;
        }
        
        // 状態を復旧
        if (needsRecovery) {
          gameRef.current.state = recoveredState;
          setGameState(recoveredState);
          console.log('[Recovery] State recovered successfully');
          
          // CPUタイマーをクリアして再スケジュール
          if (cpuTurnTimerRef.current) {
            clearTimeout(cpuTurnTimerRef.current);
            cpuTurnTimerRef.current = null;
          }
        }
        
        // CPUターンの継続判定
        if (recoveredState.phase === "AwaitMove" && recoveredState.currentPlayer !== 0) {
          console.log('[Recovery] Scheduling CPU turn continuation');
          // より短い待機時間で復旧を試行
          setTimeout(() => {
            if (gameRef.current && !gameOver) {
              const currentState = gameRef.current.state;
              if (currentState.phase === "AwaitMove" && currentState.currentPlayer !== 0) {
                console.log('[Recovery] Executing CPU turn continuation');
                playCpuTurn().catch(recoveryError => {
                  console.error('[Recovery] Failed to continue CPU turn:', recoveryError);
                  // 復旧失敗時はゲームをリセット
                  console.log('[Recovery] Resetting game due to recovery failure');
                  router.push('/cucumber/cpu/settings');
                });
              }
            }
          }, 2000); // 2秒待機で迅速な復旧
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

