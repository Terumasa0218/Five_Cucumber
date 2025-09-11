'use client';

import { Field, Graveyard, Hand, Table, Timer } from '@/components/ui';
import {
    applyMove,
    createGameView,
    createInitialState,
    endTrick,
    finalRound,
    GameConfig,
    GameState,
    Move,
    PlayerController,
    SeededRng,
    startNewRound
} from '@/lib/game-core';
import { createCpuTableFromUrlParams } from '@/lib/modes';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import './game.css';

export default function CpuPlayNew() {
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

  useEffect(() => {
    document.title = 'CPU対戦 | Five Cucumber';
    
    // テーブルを作成
    const table = createCpuTableFromUrlParams(searchParams);
    const rng = new SeededRng(table.config.seed);
    
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

  const startGame = async () => {
    if (!gameRef.current) return;
    
    const { state, config, controllers, rng, humanController } = gameRef.current;
    
    // 最初のプレイヤーがCPUの場合は自動プレイ
    if (state.currentPlayer !== 0) {
      setTimeout(() => playCpuTurn(), 1000);
    }
  };

  const playCpuTurn = async () => {
    if (!gameRef.current) return;
    
    const { state, config, controllers, rng } = gameRef.current;
    const currentPlayer = state.currentPlayer;
    
    if (currentPlayer === 0) return; // 人間のターン
    
    const controller = controllers[currentPlayer];
    const view = createGameView(state, config, currentPlayer);
    
    try {
      const move = await controller.onYourTurn(view);
      if (move !== null) {
        await playMove(currentPlayer, move);
      }
    } catch (error) {
      console.error('CPU turn error:', error);
    }
  };

  const playMove = async (player: number, card: number) => {
    if (!gameRef.current) return;
    
    const { state, config, controllers, rng } = gameRef.current;
    const move: Move = { player, card, timestamp: Date.now() };
    
    const result = applyMove(state, move, config);
    if (!result.success) {
      console.error('Invalid move:', result.message);
      return;
    }
    
    let newState = result.newState;
    
    // トリック完了チェック
    if (newState.trickCards.length === config.players) {
      const trickResult = endTrick(newState, config);
      if (trickResult.success) {
        newState = trickResult.newState;
        
        // 最終トリックかチェック
        if (newState.players.some(p => p.hand.length === 0)) {
          const finalResult = finalRound(newState, config);
          if (finalResult.success) {
            newState = finalResult.newState;
            
            if (newState.isGameOver) {
              setGameOverData(newState.gameOverPlayers.map(p => ({ 
                player: p, 
                count: newState.players[p].cucumbers 
              })));
              setGameOver(true);
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
    
    gameRef.current.state = newState;
    setGameState(newState);
    
    // 次のプレイヤーのターン
    if (newState.currentPlayer !== 0) {
      setTimeout(() => playCpuTurn(), 1000);
    }
  };

  const handleCardClick = (card: number) => {
    if (!gameRef.current) return;
    
    const { state, humanController } = gameRef.current;
    
    if (state.currentPlayer === 0) {
      humanController.playCard(card);
      playMove(0, card);
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
    <div className="game-root">
      <div className="game-container">
        <div className="hud-left">
           <div className="round-indicator" id="roundInfo">
             第{gameState.currentRound}回戦<br />
             <span style={{ whiteSpace: 'nowrap' }}>第{gameState.currentTrick}ラウンド</span>
           </div>
          <Timer
            turnSeconds={gameRef.current?.config.turnSeconds || null}
            isActive={gameState.currentPlayer === 0}
            onTimeout={() => {
              if (gameState.currentPlayer === 0) {
                // 自動プレイ
                const legalMoves = gameState.players[0].hand;
                if (legalMoves.length > 0) {
                  const minCard = Math.min(...legalMoves);
                  handleCardClick(minCard);
                }
              }
            }}
          />
        </div>
        
        <div className="hud-center">
          <div className="game-title">🥒 ５本のきゅうり 🥒</div>
        </div>
        
        <div className="hud-right">
          <button
            onClick={handleBackToHome}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            ホーム
          </button>
        </div>

        <Table
          state={gameState}
          config={gameRef.current?.config || {} as GameConfig}
          currentPlayerIndex={gameState.currentPlayer}
        />

        <div className="center-area">
          <Field state={gameState} />
          <Graveyard state={gameState} />
        </div>

        <Hand
          state={gameState}
          playerIndex={0}
          onCardClick={handleCardClick}
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
  );
}
