'use client';

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
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [isCardLocked, setIsCardLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockedCardId, setLockedCardId] = useState<number | null>(null);
  const gameRef = useRef<{ config: GameConfig; rng: SeededRng } | null>(null);
  
  // 切断対策システム
  const [disconnectedPlayers, setDisconnectedPlayers] = useState<Set<number>>(new Set());
  const [cpuReplacedPlayers, setCpuReplacedPlayers] = useState<Set<number>>(new Set());
  const disconnectTimers = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const lastActivityTime = useRef<number>(Date.now());
  
  // ゲーム状態を保存
  const saveGameState = () => {
    if (!gameRef.current || !gameState || !roomCode) return;
    
    try {
      const gameStateKey = `friend-game-state-${roomCode}`;
      const saveData = {
        gameRef: {
          ...gameRef.current,
          rng: gameRef.current.rng.getState()
        },
        gameState,
        gameOver,
        roomInfo,
        disconnectedPlayers: Array.from(disconnectedPlayers),
        cpuReplacedPlayers: Array.from(cpuReplacedPlayers),
        timestamp: Date.now()
      };
      localStorage.setItem(gameStateKey, JSON.stringify(saveData));
      console.log('[Friend Game] State saved for room:', roomCode);
    } catch (error) {
      console.warn('[Friend Game] Failed to save state:', error);
    }
  };
  
  // プレイヤーの切断を検知
  const handlePlayerDisconnect = (playerIndex: number) => {
    if (disconnectedPlayers.has(playerIndex)) return;
    
    console.log(`[Disconnect] Player ${playerIndex} disconnected`);
    setDisconnectedPlayers(prev => new Set([...prev, playerIndex]));
    
    // 45秒後にCPUに置換
    const timer = setTimeout(() => {
      if (!cpuReplacedPlayers.has(playerIndex)) {
        console.log(`[Disconnect] Replacing player ${playerIndex} with CPU`);
        setCpuReplacedPlayers(prev => new Set([...prev, playerIndex]));
        disconnectTimers.current.delete(playerIndex);
      }
    }, 45000); // 45秒
    
    disconnectTimers.current.set(playerIndex, timer);
  };
  
  // プレイヤーの復帰を処理
  const handlePlayerReconnect = (playerIndex: number) => {
    if (!disconnectedPlayers.has(playerIndex)) return;
    
    console.log(`[Reconnect] Player ${playerIndex} reconnected`);
    
    // 切断タイマーをクリア
    const timer = disconnectTimers.current.get(playerIndex);
    if (timer) {
      clearTimeout(timer);
      disconnectTimers.current.delete(playerIndex);
    }
    
    // 切断状態を解除
    setDisconnectedPlayers(prev => {
      const newSet = new Set(prev);
      newSet.delete(playerIndex);
      return newSet;
    });
    
    // CPU置換も解除（まだCPUに置換されていない場合）
    if (!cpuReplacedPlayers.has(playerIndex)) {
      console.log(`[Reconnect] Player ${playerIndex} reconnected before CPU replacement`);
    } else {
      console.log(`[Reconnect] Player ${playerIndex} reconnected, removing CPU replacement`);
      setCpuReplacedPlayers(prev => {
        const newSet = new Set(prev);
        newSet.delete(playerIndex);
        return newSet;
      });
    }
  };
  
  // アクティビティを記録
  const recordActivity = () => {
    lastActivityTime.current = Date.now();
  };

  useEffect(() => {
    document.title = `フレンド対戦 ${roomCode} | Five Cucumber`;
    
    const nickname = getNickname();
    if (!nickname) {
      console.warn('[Friend Game] No nickname found, redirecting to setup');
      router.push(`/setup?returnTo=/friend/play/${roomCode}`);
      return;
    }
    
    // 保存されたゲーム状態を復元を試みる
    const gameStateKey = `friend-game-state-${roomCode}`;
        try {
          const savedGameData = localStorage.getItem(gameStateKey);
          if (savedGameData) {
            const { 
              gameRef: savedGameRef, 
              gameState: savedGameState, 
              gameOver: savedGameOver, 
              roomInfo: savedRoomInfo,
              disconnectedPlayers: savedDisconnectedPlayers,
              cpuReplacedPlayers: savedCpuReplacedPlayers,
              timestamp
            } = JSON.parse(savedGameData);
            
            // タイムスタンプチェック（10分以内のデータのみ復元）
            const now = Date.now();
            const maxAge = 10 * 60 * 1000; // 10分
            if (timestamp && (now - timestamp) > maxAge) {
              console.log('[Friend Game] Saved data too old, starting fresh');
              localStorage.removeItem(gameStateKey);
            } else if (savedGameRef && savedGameState) {
              console.log('[Friend Game] Restoring saved game state for room:', roomCode);
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
              setRoomInfo(savedRoomInfo);
              
              // 切断情報も復元
              if (savedDisconnectedPlayers) {
                setDisconnectedPlayers(new Set(savedDisconnectedPlayers));
              }
              if (savedCpuReplacedPlayers) {
                setCpuReplacedPlayers(new Set(savedCpuReplacedPlayers));
              }
              
              // 自分が復帰した場合の処理
              const myPlayerIndex = 0; // 仮定：プレイヤー0が自分
              if (savedDisconnectedPlayers && savedDisconnectedPlayers.includes(myPlayerIndex)) {
                handlePlayerReconnect(myPlayerIndex);
              }
              
              return;
            }
          }
        } catch (error) {
          console.warn('[Friend Game] Failed to restore saved state:', error);
          localStorage.removeItem(gameStateKey);
        }
    
    // APIからルーム情報を取得
    const fetchRoom = async () => {
      try {
        console.log(`[Friend Game] Fetching room data for ${roomCode}`);
        const res = await fetch(`/api/friend/room/${roomCode}`);
        
        if (!res.ok) {
          console.error(`[Friend Game] API error: ${res.status} ${res.statusText}`);
          router.push('/friend/join');
          return;
        }
        
        const data = await res.json();
        console.log('[Friend Game] Room data received:', data);
        if (data.ok && data.room) {
          setRoomInfo(data.room);
          
          // ゲーム設定を作成（ルーム設定を使用）
          const config: GameConfig = {
            players: data.room.size,
            turnSeconds: data.room.turnSeconds === 0 ? null : data.room.turnSeconds,
            maxCucumbers: data.room.maxCucumbers,
            initialCards: 7,
            cpuLevel: 'easy', // フレンド対戦ではCPUレベルは関係ない
            minTurnMs: 500,
            minResolveMs: 600
          };
          
          // ゲーム状態を初期化
          const rng = new SeededRng(Date.now());
          const initialState = createInitialState(config, rng);
          setGameState(initialState);
          gameRef.current = { config, rng };
        } else {
          router.push('/friend/join');
        }
      } catch (err) {
        console.error('Room fetch error:', err);
        router.push('/friend/join');
      }
    };
    
    fetchRoom();
  }, [roomCode, router]);
  
  // ゲーム状態変更時の自動保存
  useEffect(() => {
    if (gameState) {
      saveGameState();
    }
  }, [gameState, gameOver, roomInfo]);

  const handleCardClick = async (card: number) => {
    if (!gameState || gameOver || gameState.currentPlayer !== 0 || isCardLocked || isSubmitting) return;
    
    // アクティビティを記録
    recordActivity();
    
    // カードを即座にロック
    setIsSubmitting(true);
    setLockedCardId(card);
    
    await runAnimation(async () => {
      // フェーズチェック
      if (gameState.phase !== "AwaitMove") {
        console.warn('Move attempted during invalid phase:', gameState.phase);
        setIsSubmitting(false);
        setLockedCardId(null);
        return;
      }
      
      // カードをロックして連続出しを防止
      setIsCardLocked(true);
      
      const move: Move = { player: 0, card, timestamp: Date.now() };
      const result = applyMove(gameState, move, gameRef.current!.config, gameRef.current!.rng);
      
      if (result.success) {
        let newState = result.newState;
        setGameState(newState);
        
        // 最小ターン時間の待機
        const minTurnMs = gameRef.current!.config.minTurnMs || 500;
        await delay(minTurnMs);
        
        // トリック解決の処理
        if (newState.phase === "ResolvingTrick") {
          const trickResult = endTrick(newState, gameRef.current!.config, gameRef.current!.rng);
          if (trickResult.success) {
            newState = trickResult.newState;
            
            // 解決時間の待機
            const minResolveMs = getMinResolveMs(gameRef.current!.config);
            await delay(minResolveMs);
            
            // 最終トリック処理
            if (newState.phase === "RoundEnd") {
              const finalResult = finalRound(newState, gameRef.current!.config, gameRef.current!.rng);
              if (finalResult.success) {
                newState = finalResult.newState;
                
                if (newState.phase === "GameEnd") {
                  setGameOver(true);
                  setGameState(newState);
                  setIsCardLocked(false);
                  return;
                }
              }
            }
          }
          
          setGameState(newState);
        }
        
        // ゲーム終了チェック
        if (newState.isGameOver) {
          setGameOver(true);
        }
        
        // カードロック解除
        setTimeout(() => {
          setIsCardLocked(false);
          setIsSubmitting(false);
          setLockedCardId(null);
        }, 500);
      } else {
        // 失敗した場合はすぐにロックを解除
        setIsCardLocked(false);
        setIsSubmitting(false);
        setLockedCardId(null);
      }
    });
  };

  const handleTimeout = () => {
    if (!gameState || gameOver || gameState.currentPlayer !== 0) return;
    
    // 最小の合法カードを自動選択
    const legalMoves = gameState.players[0].hand.filter(card => 
      card === Math.min(...gameState.players[0].hand)
    );
    
    if (legalMoves.length > 0) {
      handleCardClick(legalMoves[0]);
    }
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
            {roomInfo && (
              <div className="room-info">
                ルーム {roomCode} ({roomInfo.participants.length}/{roomInfo.size}人)
              </div>
            )}
          </div>
          
          <div className="hud-center">
            <Timer
              turnSeconds={gameRef.current ? getEffectiveTurnSeconds(gameRef.current.config) : null}
              isActive={gameState.currentPlayer === 0 && gameState.phase === "AwaitMove"}
              onTimeout={handleTimeout}
            />
          </div>
          
          <div className="hud-right">
            <a href="/home" className="btn">ホーム</a>
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
          <div className="disconnect-status">
            {Array.from(disconnectedPlayers).map(playerIndex => (
              <div key={`disconnect-${playerIndex}`} className="disconnect-notice">
                プレイヤー {playerIndex + 1} が切断中... (45秒でCPU置換)
              </div>
            ))}
            {Array.from(cpuReplacedPlayers).map(playerIndex => (
              <div key={`cpu-${playerIndex}`} className="cpu-notice">
                プレイヤー {playerIndex + 1} はCPUが代行中
              </div>
            ))}
          </div>
        )}
        
        {/* 参加者一覧 */}
        {roomInfo && (
          <div className="participants-info">
            <h3>参加者</h3>
            <div className="participants-list">
              {roomInfo.seats.filter((seat: any) => seat !== null).map((seat: any, index: number) => (
                <div key={index} className={`participant ${index === 0 ? 'current-player host' : ''}`}>
                  {seat.nickname}
                  {index === 0 && <span className="host-badge">★</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}

export default function FriendPlayPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FriendPlayContent />
    </Suspense>
  );
}
