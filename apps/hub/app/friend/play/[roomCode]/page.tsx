'use client';

import BattleLayout from '@/components/BattleLayout';
import { EllipseTable, Timer } from '@/components/ui';
import { delay, runAnimation } from '@/lib/animQueue';
import {
    applyMove,
    createInitialState,
    endTrick,
    finalRound,
    GameConfig,
    GameState,
    getEffectiveTurnSeconds,
    getLegalMoves,
    getMinResolveMs,
    Move,
    SeededRng
} from '@/lib/game-core';
import { getNickname } from '@/lib/profile';
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
  const [disconnectedPlayers, setDisconnectedPlayers] = useState<Set<number>>(new Set());
  const [cpuReplacedPlayers, setCpuReplacedPlayers] = useState<Set<number>>(new Set());
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [disconnectStartTime, setDisconnectStartTime] = useState<number | null>(null);
  
  const gameRef = useRef<{
    state: GameState;
    config: GameConfig;
    controllers: any[];
    rng: SeededRng;
  } | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  // ゲーム開始
  const startGame = async () => {
    try {
      const config: GameConfig = {
        players: 4,
        turnSeconds: 10,
        maxCucumbers: 5,
        initialCards: 7,
        seed: Date.now(),
        cpuLevel: 'normal'
      };
      
      const { SeededRng } = await import('@/lib/game-core');
      const rng = new SeededRng(config.seed);
      const state = createInitialState(config, rng);
      
      // コントローラー設定（プレイヤー0は人間、他はCPU）
      const controllers = [
        { type: 'human' },
        { type: 'cpu', level: 'normal' },
        { type: 'cpu', level: 'normal' },
        { type: 'cpu', level: 'normal' }
      ];
      
      gameRef.current = { state, config, controllers, rng };
      setGameState(state);
      setGameOver(false);
      
      console.log('[Friend Game] Started with 4 players');
      
      // 最初のプレイヤーがCPUの場合は自動プレイ
      if (state.currentPlayer !== 0) {
        setTimeout(() => {
          if (gameRef.current && gameRef.current.state.currentPlayer !== 0) {
            playCpuTurn();
          }
        }, 2000);
      }
    } catch (error) {
      console.error('[Friend Game] Failed to start game:', error);
    }
  };

  // CPUターン処理
  const playCpuTurn = async () => {
    if (!gameRef.current || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    
    try {
      const { state, config, controllers, rng } = gameRef.current;
      const currentPlayer = state.currentPlayer;
      
      if (currentPlayer === 0 || gameOver || state.phase !== "AwaitMove") {
        return;
      }
      
      console.log(`[Friend CPU] Executing turn for player ${currentPlayer}`);
      
      const legalMoves = getLegalMoves(state, currentPlayer);
      if (legalMoves.length === 0) {
        console.log(`[Friend CPU] No legal moves for player ${currentPlayer}`);
        return;
      }
      
      // 簡単なCPUロジック（ランダム選択）
      const selectedCard = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      
      const move: Move = {
        player: currentPlayer,
        card: selectedCard,
        timestamp: Date.now()
      };
      
      const result = applyMove(state, move, config, rng);
      if (result.success) {
        gameRef.current.state = result.newState;
        setGameState(result.newState);
        
        // アニメーション待機
        await delay(getMinResolveMs(gameRef.current?.config || {} as GameConfig));
        
        // トリック解決
        if (result.newState.phase === "ResolvingTrick") {
          const trickResult = endTrick(result.newState, config, rng);
          if (trickResult.success) {
            gameRef.current.state = trickResult.newState;
            setGameState(trickResult.newState);
            
            // ラウンド終了
            if (trickResult.newState.phase === "RoundEnd") {
              const finalResult = finalRound(trickResult.newState, config, rng);
              if (finalResult.success) {
                gameRef.current.state = finalResult.newState;
                setGameState(finalResult.newState);
                
                if (finalResult.newState.phase === "GameEnd") {
                  setGameOver(true);
                } else {
                  // 新しいラウンド開始
                  const { startNewRound } = await import('@/lib/game-core');
                  const roundResult = startNewRound(finalResult.newState, config, rng);
                  if (roundResult.success) {
                    gameRef.current.state = roundResult.newState;
                    setGameState(roundResult.newState);
                  }
                }
              }
            }
          }
        }
        
        // 次のCPUターンをスケジューリング
        setTimeout(() => {
          if (gameRef.current && gameRef.current.state.currentPlayer !== 0 && !gameOver) {
            playCpuTurn();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('[Friend CPU] Error during turn:', error);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // カードクリック処理
  const handleCardClick = async (card: number) => {
    if (!gameState || gameState.currentPlayer !== 0 || isSubmitting || isCardLocked) return;
    
    setIsSubmitting(true);
    setIsCardLocked(true);
    setLockedCardId(card);
    
    try {
      const move: Move = {
        player: 0,
        card,
        timestamp: Date.now()
      };
      
      const result = applyMove(gameState, move, gameRef.current!.config, gameRef.current!.rng);
      if (result.success) {
        gameRef.current!.state = result.newState;
        setGameState(result.newState);
        
        // アニメーション待機
        await delay(getMinResolveMs(gameRef.current?.config || {} as GameConfig));
        
        // トリック解決
        if (result.newState.phase === "ResolvingTrick") {
          const trickResult = endTrick(result.newState, gameRef.current!.config, gameRef.current!.rng);
          if (trickResult.success) {
            gameRef.current!.state = trickResult.newState;
            setGameState(trickResult.newState);
            
            // ラウンド終了
            if (trickResult.newState.phase === "RoundEnd") {
              const finalResult = finalRound(trickResult.newState, gameRef.current!.config, gameRef.current!.rng);
              if (finalResult.success) {
                gameRef.current!.state = finalResult.newState;
                setGameState(finalResult.newState);
                
                if (finalResult.newState.phase === "GameEnd") {
                  setGameOver(true);
                } else {
                  // 新しいラウンド開始
                  const { startNewRound } = await import('@/lib/game-core');
                  const roundResult = startNewRound(finalResult.newState, gameRef.current!.config, gameRef.current!.rng);
                  if (roundResult.success) {
                    gameRef.current!.state = roundResult.newState;
                    setGameState(roundResult.newState);
                  }
                }
              }
            }
          }
        }
        
        // 次のCPUターンをスケジューリング
        setTimeout(() => {
          if (gameRef.current && gameRef.current.state.currentPlayer !== 0 && !gameOver) {
            playCpuTurn();
          }
        }, 1000);
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
    if (!gameState || gameOver || gameState.currentPlayer !== 0) return;
    
    // 制限時間切れ時のランダムカード選択
    const legalMoves = getLegalMoves(gameState, 0);
    if (legalMoves.length > 0) {
      // ランダムにカードを選択
      const randomIndex = Math.floor(Math.random() * legalMoves.length);
      const selectedCard = legalMoves[randomIndex];
      console.log(`[Friend Timeout] Auto-selecting random card: ${selectedCard} from legal moves:`, legalMoves);
      handleCardClick(selectedCard);
    } else {
      // 合法手がない場合は最小カードを選択
      const hand = gameState.players[0].hand;
      if (hand.length > 0) {
        const minCard = Math.min(...hand);
        console.log(`[Friend Timeout] No legal moves, selecting minimum card: ${minCard}`);
        handleCardClick(minCard);
      }
    }
  };

  // ページの可視性監視（切断検知）
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsPageVisible(isVisible);
      
      if (!isVisible && !disconnectStartTime) {
        // ページが非表示になった時刻を記録
        setDisconnectStartTime(Date.now());
        console.log('[Friend] Player disconnected - starting 45s timer');
      } else if (isVisible && disconnectStartTime) {
        // ページが再表示された場合、切断タイマーをリセット
        setDisconnectStartTime(null);
        console.log('[Friend] Player reconnected - canceling disconnect timer');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [disconnectStartTime]);

  // 切断タイマーの管理
  useEffect(() => {
    if (disconnectStartTime) {
      const timer = setTimeout(() => {
        // 45秒経過後、CPUに置き換え
        console.log('[Friend] 45 seconds elapsed - replacing with CPU');
        setCpuReplacedPlayers(prev => new Set(prev).add(0));
        setDisconnectStartTime(null);
      }, 45000); // 45秒

      return () => clearTimeout(timer);
    }
  }, [disconnectStartTime]);

  // ゲーム開始
  useEffect(() => {
    startGame();
  }, []);

  // タイマー管理
  useEffect(() => {
    if (gameState && gameState.currentPlayer === 0 && gameState.phase === "AwaitMove" && !gameOver) {
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
  }, [gameState?.currentPlayer, gameState?.phase, gameOver]);

  if (!gameState) {
    return (
      <BattleLayout>
        <div className="game-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            Loading...
          </div>
        </div>
      </BattleLayout>
    );
  }

  return (
    <BattleLayout>
      <div className="game-container">
        <header className="hud layer-hud">
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
              isActive={gameState.currentPlayer === 0 && gameState.phase === "AwaitMove"}
              onTimeout={handleTimeout}
            />
          </div>
          
          <div className="hud-right">
            {/* フレンド対戦中は中断・ホームボタンを非表示 */}
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
        
        {/* 切断状態の表示 */}
        {(disconnectedPlayers.size > 0 || cpuReplacedPlayers.size > 0) && (
          <div className="disconnect-notice">
            <p>一部のプレイヤーが切断されました。CPUに置き換えられました。</p>
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
