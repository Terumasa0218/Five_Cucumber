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
  Move,
  PlayerController,
  SeededRng,
  startNewRound
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
  const isProcessingRef = useRef<boolean>(false);
  
  // ゲーム状態の保存キー
  const getGameStateKey = useCallback((params: URLSearchParams) => {
    const players = params.get('players') || '4';
    const turnSeconds = params.get('turnSeconds') || '15';
    const maxCucumbers = params.get('maxCucumbers') || '6';
    const cpuLevel = params.get('cpuLevel') || 'normal';
    return `cpu-game-state-${players}-${turnSeconds}-${maxCucumbers}-${cpuLevel}`;
  }, []);
  
  // ゲーム状態を保存（リロード時の復元用のみ）
  const saveGameState = useCallback(() => {
    if (!gameRef.current || !gameState || isProcessingRef.current) return;
    
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
        timestamp: Date.now()
      };
      localStorage.setItem(gameStateKey, JSON.stringify(saveData));
      console.log('[Game] State saved for reload recovery');
    } catch (error) {
      console.warn('[Game] Failed to save state:', error);
    }
  }, [gameState, gameOver, gameOverData, searchParams, getGameStateKey]);
  
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
      // リロード復元を試行
      try {
        const savedData = localStorage.getItem(gameStateKey);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          const now = Date.now();
          const age = now - parsed.timestamp;
          
          // 5分以内のセーブデータのみ復元
          if (age < 5 * 60 * 1000) {
            console.log('[Game] Restoring from saved state (age:', Math.round(age / 1000), 'seconds)');
            
            // RNG状態を復元
            const { SeededRng } = require('@/lib/game-core');
            const restoredRng = new SeededRng();
            restoredRng.setState(parsed.gameRef.rng);
            
            gameRef.current = {
              ...parsed.gameRef,
              rng: restoredRng
            };
            
            setGameState(parsed.gameState);
            setGameOver(parsed.gameOver || false);
            setGameOverData(parsed.gameOverData || []);
            
            console.log('[Game] State restored successfully');
            return;
          } else {
            console.log('[Game] Saved state too old, starting fresh');
            clearCpuGameState();
          }
        }
      } catch (error) {
        console.warn('[Game] Failed to restore state:', error);
        clearCpuGameState();
      }
    }
    
    // 新規ゲーム開始
    startGame();
  }, []);

  // ゲーム状態変更時の自動保存（処理中は除外）
  useEffect(() => {
    if (gameState && !isProcessingRef.current) {
      saveGameState();
    }
  }, [gameState, gameOver, gameOverData, saveGameState]);

  const startGame = async () => {
    try {
      const { config, controllers, humanController } = createCpuTableFromUrlParams(searchParams);
      const { SeededRng } = await import('@/lib/game-core');
      const rng = new SeededRng(config.seed);
      const state = createInitialState(config, rng);
      
      gameRef.current = { state, config, controllers, rng, humanController };
      setGameState(state);
      setGameOver(false);
      setGameOverData([]);
      
      console.log('[Game] New game started with', config.players, 'players');
      
      // 最初のプレイヤーがCPUの場合は自動プレイ
      if (state.currentPlayer !== 0) {
        setTimeout(() => {
          if (gameRef.current && gameRef.current.state.currentPlayer !== 0) {
            scheduleCpuTurn();
          }
        }, 2000);
      }
    } catch (error) {
      console.error('[Game] Failed to start game:', error);
    }
  };

  const scheduleCpuTurn = () => {
    if (!gameRef.current || !gameState || isProcessingRef.current) return;
    
    const { state } = gameRef.current;
    
    // 条件チェック
    if (state.currentPlayer === 0 || gameOver || state.phase !== "AwaitMove") {
      return;
    }
    
    // 既存のタイマーをクリア
    if (cpuTurnTimerRef.current) {
      clearTimeout(cpuTurnTimerRef.current);
      cpuTurnTimerRef.current = null;
    }
    
    console.log(`[CPU] Scheduling turn for player ${state.currentPlayer}`);
    
    // CPUの思考時間
    const thinkingTime = 2000 + Math.random() * 2000;
    cpuTurnTimerRef.current = setTimeout(() => {
      if (gameRef.current && !isProcessingRef.current) {
        playCpuTurn();
      }
    }, thinkingTime);
  };

  const playCpuTurn = async () => {
    if (!gameRef.current || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    cpuTurnTimerRef.current = null;
    
    try {
      const { state, config, controllers, rng } = gameRef.current;
      const currentPlayer = state.currentPlayer;
      
      if (currentPlayer === 0 || gameOver || state.phase !== "AwaitMove") {
        console.log(`[CPU] Skipping turn - Player: ${currentPlayer}, Phase: ${state.phase}, GameOver: ${gameOver}`);
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
          if (state.currentPlayer !== 0 && state.phase === "AwaitMove") {
            console.log(`[CPU] Auto-scheduling next turn for player ${state.currentPlayer}`);
            scheduleCpuTurn();
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

  const playMove = async (player: number, card: number) => {
    if (!gameRef.current) return;
    
    console.log(`[PlayMove] Starting move - Player: ${player}, Card: ${card}`);
    
    try {
      await runAnimation(async () => {
        if (!gameRef.current) return;
        
        const { state, config, rng } = gameRef.current;
        
        // 状態チェック
        if (state.phase !== "AwaitMove") {
          console.warn(`[PlayMove] Invalid phase: ${state.phase}`);
          return;
        }
        
        // プレイヤー番号の検証
        if (state.currentPlayer !== player) {
          console.warn(`[PlayMove] Player mismatch: requested ${player}, current ${state.currentPlayer}`);
          return;
        }
        
        // 手札の確認
        const playerHand = state.players[player]?.hand;
        if (!playerHand || !playerHand.includes(card)) {
          console.error(`[PlayMove] Card ${card} not in player ${player} hand`);
          return;
        }
        
        // 合法手の確認
        const legalMoves = getLegalMoves(state, player);
        if (!legalMoves.includes(card)) {
          console.error(`[PlayMove] Card ${card} is not legal for player ${player}`);
          return;
        }
        
        // カードをプレイ
        const move: Move = { player, card, timestamp: Date.now() };
        const result = applyMove(state, move, config, rng);
        
        if (!result.success) {
          console.error(`[PlayMove] Failed to apply move:`, result.message);
          return;
        }
        
        let newState = result.newState;
        console.log(`[PlayMove] Move applied successfully, new phase: ${newState.phase}`);
        
        // 状態更新
        gameRef.current.state = newState;
        setGameState(newState);
        
        // 最小ターン時間の待機
        const minTurnMs = config.minTurnMs || 500;
        await delay(minTurnMs);
        
        // トリック解決フェーズの処理
        if (newState.phase === "ResolvingTrick") {
          console.log('[PlayMove] Resolving trick...');
          const trickResult = endTrick(newState, config, rng);
          if (trickResult.success) {
            newState = trickResult.newState;
            gameRef.current.state = newState;
            setGameState(newState);
            console.log(`[PlayMove] Trick resolved, new phase: ${newState.phase}`);
            
            // ラウンド終了の処理
            if (newState.phase === "RoundEnd") {
              console.log('[PlayMove] Round ended, processing final round...');
              const finalResult = finalRound(newState, config, rng);
              if (finalResult.success) {
                newState = finalResult.newState;
                gameRef.current.state = newState;
                setGameState(newState);
                console.log(`[PlayMove] Final round processed, new phase: ${newState.phase}`);
                
                if (newState.phase === "GameEnd") {
                  console.log('[PlayMove] Game ended');
                  setGameOver(true);
                  setGameOverData(newState.players.map((p, index) => ({ player: index, count: p.cucumbers })));
                } else {
                  // 新しいラウンド開始
                  const roundResult = startNewRound(newState, config, rng);
                  if (roundResult.success) {
                    newState = roundResult.newState;
                    gameRef.current.state = newState;
                    setGameState(newState);
                    console.log('[PlayMove] New round started');
                  }
                }
              }
            }
          }
        }
        
        console.log(`[PlayMove] Move completed - Player: ${player}, Card: ${card}`);
        
        // プレイヤー0（人間）のターン後、次のCPUターンをスケジューリング
        if (player === 0) {
          setTimeout(() => {
            if (gameRef.current && !gameOver) {
              const { state } = gameRef.current;
              if (state.currentPlayer !== 0 && state.phase === "AwaitMove") {
                console.log(`[PlayMove] Scheduling next CPU turn for player ${state.currentPlayer}`);
                scheduleCpuTurn();
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
    if (gameState && !gameOver && !isProcessingRef.current && gameRef.current) {
      const { state } = gameRef.current;
      if (state.currentPlayer !== 0 && state.phase === "AwaitMove") {
        console.log(`[useEffect] Scheduling CPU turn for player ${state.currentPlayer}`);
        scheduleCpuTurn();
      }
    }
    
    return () => {
      if (cpuTurnTimerRef.current) {
        clearTimeout(cpuTurnTimerRef.current);
        cpuTurnTimerRef.current = null;
      }
    };
  }, [gameState?.currentPlayer, gameState?.phase, gameOver]);

  const handleCardClick = async (card: number) => {
    if (!gameRef.current || isCardLocked || isSubmitting || isProcessingRef.current) return;
    
    const { state } = gameRef.current;
    
    if (state.currentPlayer === 0 && state.phase === 'AwaitMove') {
      setIsSubmitting(true);
      setLockedCardId(card);
      setIsCardLocked(true);
      
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
    if (!gameRef.current || gameState?.currentPlayer !== 0 || isProcessingRef.current) return;
    
    console.log('[Timeout] Handling timeout for player 0');
    
    // 制限時間切れ時のランダムカード選択
    const legalMoves = getLegalMoves(gameState, 0);
    if (legalMoves.length > 0) {
      const randomIndex = Math.floor(Math.random() * legalMoves.length);
      const selectedCard = legalMoves[randomIndex];
      console.log(`[Timeout] Auto-selecting random card: ${selectedCard} from legal moves:`, legalMoves);
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
            <div className="game-title">5本のき、テス</div>
          </div>
          
          <div className="hud-center">
            <Timer
              turnSeconds={gameRef.current ? getEffectiveTurnSeconds(gameRef.current.config) : null}
              isActive={gameState.currentPlayer === 0 && gameState.phase === "AwaitMove"}
              onTimeout={handleTimeout}
            />
          </div>
          
          <div className="hud-right">
            <button onClick={handleRestart} className="btn">再開</button>
            <button onClick={handleBackToHome} className="btn">ホーム</button>
          </div>
        </header>

        <EllipseTable
          state={gameState}
          config={gameRef.current?.config || {} as GameConfig}
          currentPlayerIndex={gameState.currentPlayer}
          onCardClick={handleCardClick}
          className={isCardLocked ? 'cards-locked' : ''}
          isSubmitting={isSubmitting}
          lockedCardId={lockedCardId}
        />
        
        {/* デバッグ情報 */}
        {showAllHands && (
          <div className="debug-info">
            <h3>デバッグ情報</h3>
            <div className="debug-content">
              <p>現在のプレイヤー: {gameState.currentPlayer}</p>
              <p>フェーズ: {gameState.phase}</p>
              <p>場のカード: {gameState.fieldCard || 'なし'}</p>
              <p>トリックカード数: {gameState.trickCards.length}</p>
              {gameState.players.map((player, index) => (
                <div key={index}>
                  <p>プレイヤー{index}: 手札{player.hand.length}枚, キュウリ{player.cucumbers}個</p>
                  {showAllHands && <p>手札: {player.hand.join(', ')}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

      {gameOver && (
        <div className="game-over">
          <div className="game-over-content">
            <h2>ゲーム終了</h2>
            <div className="final-scores">
              {gameOverData.map((data, index) => (
                <div key={index} className="score-item">
                  プレイヤー{data.player}: {data.count}個のキュウリ
                </div>
              ))}
            </div>
            <button onClick={handleRestart} className="btn">新しいゲーム</button>
            <button onClick={handleBackToHome} className="btn">ホームに戻る</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CpuPlayPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CpuPlayContent />
    </Suspense>
  );
}