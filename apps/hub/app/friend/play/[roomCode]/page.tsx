'use client';

import { EllipseTable, Timer } from '@/components/ui';
import {
    applyMove,
    createInitialState,
    endTrick,
    finalRound,
    GameConfig,
    GameState,
    getEffectiveTurnSeconds,
    getMinResolveMs,
    Move,
    SeededRng
} from '@/lib/game-core';
import { delay, runAnimation } from '@/lib/animQueue';
import { getProfile } from '@/lib/profile';
import { getRoom } from '@/lib/roomMock';
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
  const gameRef = useRef<{ config: GameConfig; rng: SeededRng } | null>(null);

  useEffect(() => {
    document.title = `フレンド対戦 ${roomCode} | Five Cucumber`;
    
    // ルーム情報を取得
    const room = getRoom(roomCode);
    if (!room) {
      router.push('/friend/join');
      return;
    }
    
    setRoomInfo(room);
    
    const profile = getProfile();
    if (!profile?.nickname) {
      router.push('/setup');
      return;
    }
    
    // ゲーム設定を作成
    const config: GameConfig = {
      players: room.size,
      turnSeconds: room.limit,
      maxCucumbers: room.cucumber,
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
  }, [roomCode, router]);

  const handleCardClick = async (card: number) => {
    if (!gameState || gameOver || gameState.currentPlayer !== 0 || isCardLocked) return;
    
    await runAnimation(async () => {
      // フェーズチェック
      if (gameState.phase !== "AwaitMove") {
        console.warn('Move attempted during invalid phase:', gameState.phase);
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
        }, 500);
      } else {
        // 失敗した場合はすぐにロックを解除
        setIsCardLocked(false);
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
        />
        
        {/* 参加者一覧 */}
        {roomInfo && (
          <div className="participants-info">
            <h3>参加者</h3>
            <div className="participants-list">
              {roomInfo.participants.map((name: string, index: number) => (
                <div key={index} className={`participant ${index === 0 ? 'current-player' : ''}`}>
                  {name}
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
