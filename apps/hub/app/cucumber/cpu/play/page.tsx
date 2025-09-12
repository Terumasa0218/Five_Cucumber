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
      if (savedGameData) {
        const { gameRef: savedGameRef, gameState: savedGameState, gameOver: savedGameOver, gameOverData: savedGameOverData } = JSON.parse(savedGameData);
        
        if (savedGameRef && savedGameState) {
          console.log('[Game] Restoring saved game state');
          const rng = new SeededRng();
          if (savedGameRef.rng) {
            rng.setState(savedGameRef.rng);
          }
          gameRef.current = {
            ...savedGameRef,
            rng
          };
          setGameState(savedGameState);
          setGameOver(savedGameOver || false);
          setGameOverData(savedGameOverData || []);
          return;
        }
      }
    } catch (error) {
      console.warn('[Game] Failed to restore saved state:', error);
      localStorage.removeItem(gameStateKey);
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
    
    // 最初のプレイヤーがCPUの場合は自動プレイ（少し待つ）
    if (state.currentPlayer !== 0) {
      setTimeout(() => playCpuTurn(), 2000);
    }
  };

  const playCpuTurn = async () => {
    if (!gameRef.current || gameOver) return;
    
    const { state, config, controllers, rng } = gameRef.current;
    const currentPlayer = state.currentPlayer;
    
    if (currentPlayer === 0) return; // 人間のターン
    if (state.phase !== "AwaitMove") return; // 適切なフェーズでない
    
    const controller = controllers[currentPlayer];
    const view = createGameView(state, config, currentPlayer);
    
    try {
      const move = await controller.onYourTurn(view);
      if (move !== null && typeof move === 'number') {
        console.log(`[CPU ${currentPlayer}] Playing card:`, move);
        await playMove(currentPlayer, move);
      } else {
        console.warn(`[CPU ${currentPlayer}] No valid move returned:`, move);
        // フォールバック：最初の有効なカードを出す
        const hand = state.players[currentPlayer]?.hand;
        if (hand && hand.length > 0) {
          const fallbackMove = hand[0];
          console.log(`[CPU ${currentPlayer}] Using fallback move:`, fallbackMove);
          await playMove(currentPlayer, fallbackMove);
        }
      }
    } catch (error) {
      console.error(`[CPU ${currentPlayer}] Turn error:`, error);
      // エラー時のフォールバック処理
      const hand = state.players[currentPlayer]?.hand;
      if (hand && hand.length > 0) {
        const fallbackMove = hand[0];
        console.log(`[CPU ${currentPlayer}] Error fallback move:`, fallbackMove);
        await playMove(currentPlayer, fallbackMove);
      }
    }
  };

  // CPU手番の処理をuseEffectで分離
  useEffect(() => {
    if (!gameState || gameState.currentPlayer === 0 || gameOver || gameState.phase !== "AwaitMove") return;
    
    // CPUの思考時間を長めに設定（1.5〜3秒のランダム）
    const thinkingTime = 1500 + Math.random() * 1500;
    const timer = setTimeout(() => {
      playCpuTurn();
    }, thinkingTime);
    
    return () => clearTimeout(timer);
  }, [gameState?.currentPlayer, gameState?.phase, gameOver]);

  const playMove = async (player: number, card: number) => {
    if (!gameRef.current || gameOver) return;
    
    try {
      await runAnimation(async () => {
        const { state, config, controllers, rng } = gameRef.current!;
        
        // フェーズチェック
        if (state.phase !== "AwaitMove") {
          console.warn('Move attempted during invalid phase:', state.phase);
          return;
        }
        
        const move: Move = { player, card, timestamp: Date.now() };
        
        const result = applyMove(state, move, config, rng);
        if (!result.success) {
          console.error('Invalid move:', result.message || 'Unknown error');
          return;
        }

      let newState = result.newState;
      
      // 状態更新（カード移動アニメーション用の猶予）
      gameRef.current!.state = newState;
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
                setGameOverData(newState.gameOverPlayers.map(p => ({ 
                  player: p, 
                  count: newState.players[p].cucumbers 
                })));
                setGameOver(true);
                gameRef.current!.state = newState;
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

        gameRef.current!.state = newState;
        setGameState(newState);
      });
    } catch (error) {
      console.error('Error in playMove:', error);
      // エラーが発生した場合、ゲームが止まらないように次のプレイヤーに進む
      if (gameRef.current && !gameOver) {
        const { state } = gameRef.current;
        if (state.phase === "AwaitMove" && state.currentPlayer !== 0) {
          setTimeout(() => playCpuTurn(), 1000);
        }
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
            <Timer
              turnSeconds={gameRef.current ? getEffectiveTurnSeconds(gameRef.current.config) : null}
              isActive={gameState.currentPlayer === 0 && gameState.phase === "AwaitMove"}
              onTimeout={handleTimeout}
            />
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

