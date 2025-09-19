'use client';

import BattleLayout from '@/components/BattleLayout';
import { EllipseTable, Timer } from '@/components/ui';
import {
    createInitialState,
    GameConfig,
    GameState,
    getEffectiveTurnSeconds,
    getLegalMoves,
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
  const [toast, setToast] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [disconnectedPlayers, setDisconnectedPlayers] = useState<Set<number>>(new Set());
  const [cpuReplacedPlayers, setCpuReplacedPlayers] = useState<Set<number>>(new Set());
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [disconnectStartTime, setDisconnectStartTime] = useState<number | null>(null);
  const [isGameInitialized, setIsGameInitialized] = useState(false);
  const [roomConfig, setRoomConfig] = useState<{
    size: number;
    turnSeconds: number;
    maxCucumbers: number;
    seats: any[];
  } | null>(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  
  const gameRef = useRef<{
    state: GameState;
    config: GameConfig;
    controllers: any[];
    rng: SeededRng;
  } | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const lastVersionRef = useRef<number>(0);

  // ルーム情報を取得
  const fetchRoomConfig = async (): Promise<{ room: any; playerIndex: number } | null> => {
    try {
      console.log('[Friend Game] Fetching room config for:', roomCode);
      const res = await fetch(`/api/friend/room/${roomCode}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          console.error('[Friend Game] Room not found:', roomCode);
          throw new Error(`Room ${roomCode} not found`);
        }
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      if (!data.ok || !data.room) {
        throw new Error('Invalid room data received');
      }
      
      console.log('[Friend Game] Room data received:', data.room);
      
      setRoomConfig({
        size: data.room.size,
        turnSeconds: data.room.turnSeconds,
        maxCucumbers: data.room.maxCucumbers,
        seats: data.room.seats
      });
      
      // 現在のプレイヤーのインデックスを設定（ニックネーム基準）
      const nickname = getNickname();
      console.log('[Friend Game] Current nickname:', nickname);
      console.log('[Friend Game] Room seats:', data.room.seats);
      
      if (nickname && data.room.seats) {
        const playerIndex = data.room.seats.findIndex((seat: any) => seat?.nickname === nickname);
        console.log('[Friend Game] Found player index:', playerIndex);
        
        if (playerIndex >= 0) {
          setCurrentPlayerIndex(playerIndex);
          console.log('[Friend Game] Set current player index to:', playerIndex);
        } else {
          console.error('[Friend Game] Player not found in room seats!');
          console.error('[Friend Game] Available seats:', data.room.seats.map((s: any, i: number) => `${i}: ${s?.nickname || 'empty'}`));
          throw new Error(`Player ${nickname} not found in room ${roomCode}`);
        }
      } else {
        throw new Error('No nickname or seats found');
      }
      
      return { room: data.room, playerIndex: data.room.seats.findIndex((s: any) => s?.nickname === getNickname()) };
    } catch (error) {
      console.error('[Friend Game] Failed to fetch room config:', error);
      // エラー時はホームにリダイレクト
      router.push('/home');
      return null;
    }
  };

  // ゲーム開始
  const startGame = async () => {
    try {
      console.log('[Friend Game] Starting game initialization...');
      
      // まずルーム情報を取得
      const info = await fetchRoomConfig();
      if (!info) {
        console.error('[Friend Game] Cannot start game without room config');
        return;
      }
      const room = info.room;
      const myIndex = info.playerIndex;

      // ルームの状態をチェック（ホストは開始フラグを立て直す／ゲストは短時間待機）
      if (room.status !== 'playing') {
        if (myIndex === 0) {
          try {
            await fetch('/api/friend/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roomId: roomCode, status: 'playing' })
            });
            room.status = 'playing';
          } catch (e) {
            console.warn('[Friend Game] Failed to set playing status, will continue as host:', e);
          }
        } else {
          // ゲストは最大5回リトライ（約2秒）
          let tries = 0;
          while (tries < 5) {
            await new Promise(r => setTimeout(r, 400));
            try {
              const rf = await fetch(`/api/friend/room/${roomCode}`);
              if (rf.ok) {
                const d = await rf.json();
                if (d?.room?.status === 'playing') { room.status = 'playing'; break; }
              }
            } catch {}
            tries++;
          }
          if (room.status !== 'playing') {
            console.error('[Friend Game] Room is not in playing status after wait:', room.status);
            router.push(`/friend/room/${roomCode}`);
            return;
          }
        }
      }

      // プレイヤーがルームに参加しているかチェック
      const nickname = getNickname();
      const isPlayerInRoom = room.seats.some((seat: any) => seat?.nickname === nickname);
      if (!isPlayerInRoom) {
        console.error('[Friend Game] Player not in room, redirecting to room page');
        router.push(`/friend/room/${roomCode}`);
        return;
      }

      const config: GameConfig = {
        players: room.size,
        turnSeconds: room.turnSeconds === 0 ? null : room.turnSeconds,
        maxCucumbers: room.maxCucumbers,
        initialCards: 7,
        seed: Number(room.seed ?? Date.now()),
        cpuLevel: 'normal'
      };
      
      const { SeededRng } = await import('@/lib/game-core');
      const controllers = Array(room.size).fill(null).map((_, idx) => ({ type: 'human', name: idx === myIndex ? 'あなた' : (room.seats[idx]?.nickname || `P${idx+1}`) }));

      const isHost = myIndex === 0;
      if (isHost) {
        const rng = new SeededRng(config.seed);
        const state = createInitialState(config, rng);
        gameRef.current = { state, config, controllers, rng };
        setGameState(state);
        setGameOver(false);
        setIsGameInitialized(true);
        console.log(`[Friend Game] Host initialized local state and posting snapshot`);
        const res = await fetch(`/api/friend/game/${roomCode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'init', state, config }) });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.snapshot) {
            lastVersionRef.current = data.snapshot.version ?? 1;
          }
        }
      } else {
        // 参加者はサーバーのスナップショットを取得するまで待機
        const res = await fetch(`/api/friend/game/${roomCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.snapshot) {
            const rng = new SeededRng(data.snapshot.config.seed);
            gameRef.current = { state: data.snapshot.state, config: data.snapshot.config, controllers, rng };
            setGameState(data.snapshot.state);
            setIsGameInitialized(true);
            lastVersionRef.current = data.snapshot.version ?? 1;
          }
        }
      }

      // ポーリングでサーバー権威の状態を反映
      const poll = setInterval(async () => {
        try {
          const r = await fetch(`/api/friend/game/${roomCode}`);
          if (!r.ok) return;
          const d = await r.json();
          if (d.ok && d.snapshot) {
            if (!lastVersionRef.current || d.snapshot.version > lastVersionRef.current) {
              lastVersionRef.current = d.snapshot.version;
              if (gameRef.current) {
                gameRef.current.state = d.snapshot.state;
                gameRef.current.config = d.snapshot.config;
              }
              setGameState(d.snapshot.state);
            }
          }
        } catch {}
      }, 800);
      (window as any).__friend_poll = poll;
    } catch (error) {
      console.error('[Friend Game] Failed to start game:', error);
      setToast('ゲーム初期化に失敗しました');
      router.push('/home');
    }
  };


  // カードクリック処理
  const handleCardClick = async (card: number) => {
    if (!gameRef.current || !gameState || gameRef.current.state.currentPlayer !== currentPlayerIndex || isSubmitting || isCardLocked) return;
    
    setIsSubmitting(true);
    setIsCardLocked(true);
    setLockedCardId(card);
    
    try {
      const move: Move = {
        player: currentPlayerIndex,
        card,
        timestamp: Date.now()
      };
      
      console.log(`[Friend Game] Player ${currentPlayerIndex} plays card ${card}`);
      // サーバーに移譲
      const post = await fetch(`/api/friend/game/${roomCode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'move', move }) });
      if (post.ok) {
        const data = await post.json();
        if (data.ok && data.snapshot) {
          lastVersionRef.current = data.snapshot.version ?? (lastVersionRef.current + 1);
          gameRef.current.state = data.snapshot.state;
          setGameState(data.snapshot.state);
        }
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
    if (!gameState || gameOver || gameState.currentPlayer !== currentPlayerIndex) return;
    
    // 制限時間切れ時のランダムカード選択
    const legalMoves = getLegalMoves(gameState, currentPlayerIndex);
    if (legalMoves.length > 0) {
      // ランダムにカードを選択
      const randomIndex = Math.floor(Math.random() * legalMoves.length);
      const selectedCard = legalMoves[randomIndex];
      console.log(`[Friend Timeout] Player ${currentPlayerIndex} auto-selecting random card: ${selectedCard} from legal moves:`, legalMoves);
      handleCardClick(selectedCard);
    } else {
      // 合法手がない場合は最小カードを選択
      const hand = gameState.players[currentPlayerIndex].hand;
      if (hand.length > 0) {
        const minCard = Math.min(...hand);
        console.log(`[Friend Timeout] Player ${currentPlayerIndex} no legal moves, selecting minimum card: ${minCard}`);
        handleCardClick(minCard);
      }
    }
  };

  // ページの可視性監視（切断検知）
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsPageVisible(isVisible);
      
      // ゲームが初期化されていない場合は切断検知しない
      if (!isGameInitialized) {
        return;
      }
      
      if (!isVisible && !disconnectStartTime) {
        // ページが非表示になった時刻を記録
        setDisconnectStartTime(Date.now());
        console.log(`[Friend] Player ${currentPlayerIndex} disconnected - starting 45s timer`);
      } else if (isVisible && disconnectStartTime) {
        // ページが再表示された場合、切断タイマーをリセット
        setDisconnectStartTime(null);
        console.log(`[Friend] Player ${currentPlayerIndex} reconnected - canceling disconnect timer`);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [disconnectStartTime, isGameInitialized, currentPlayerIndex]);

  // 切断タイマーの管理
  useEffect(() => {
    if (disconnectStartTime && isGameInitialized) {
      const timer = setTimeout(() => {
        // 45秒経過後、CPUに置き換え
        console.log(`[Friend] 45 seconds elapsed - replacing player ${currentPlayerIndex} with CPU`);
        setCpuReplacedPlayers(prev => new Set(prev).add(currentPlayerIndex));
        setDisconnectStartTime(null);
      }, 45000); // 45秒

      return () => clearTimeout(timer);
    }
  }, [disconnectStartTime, currentPlayerIndex, isGameInitialized]);

  // ゲーム開始
  useEffect(() => {
    if (roomCode) {
      startGame();
    }
  }, [roomCode]);

  // タイマー管理
  useEffect(() => {
    if (gameState && gameState.currentPlayer === currentPlayerIndex && gameState.phase === "AwaitMove" && !gameOver) {
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
  }, [gameState?.currentPlayer, gameState?.phase, gameOver, currentPlayerIndex]);

  if (!gameState) {
    return (
      <BattleLayout>
        <div className="game-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column' }}>
            <div style={{ color: 'white', fontSize: '18px', marginBottom: '20px' }}>
              ゲームを読み込み中...
            </div>
            <div style={{ color: 'white', fontSize: '14px', opacity: 0.8 }}>
              ルーム: {roomCode}
            </div>
          </div>
        </div>
      </BattleLayout>
    );
  }

  return (
    <BattleLayout>
      <div className="game-container">
        {countdown !== null && (
          <div className="countdown-overlay">
            <div className="countdown-number">{countdown}</div>
          </div>
        )}
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
              isActive={gameState.currentPlayer === currentPlayerIndex && gameState.phase === "AwaitMove"}
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
          currentPlayerIndex={currentPlayerIndex}
          onCardClick={handleCardClick}
          className={isCardLocked ? 'cards-locked' : ''}
          isSubmitting={isSubmitting}
          lockedCardId={lockedCardId}
          names={roomConfig?.seats?.map((s: any, idx: number) => idx === currentPlayerIndex ? 'あなた' : (s?.nickname || `P${idx+1}`))}
          mySeatIndex={currentPlayerIndex}
        />

        {toast && (
          <div className="toast" role="status" aria-live="polite">{toast}</div>
        )}
        
        {/* 切断状態の表示 */}
        {cpuReplacedPlayers.size > 0 && (
          <div className="disconnect-notice">
            <p>一部のプレイヤーが切断されました。CPUに置き換えられました。</p>
            <p>プレイヤー: {Array.from(cpuReplacedPlayers).map(index => 
              roomConfig?.seats[index]?.nickname || `プレイヤー${index + 1}`
            ).join(', ')}</p>
          </div>
        )}
        
        {/* デバッグ情報 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="debug-info" style={{ position: 'fixed', top: '10px', right: '10px', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px', fontSize: '12px' }}>
            <div>Current Player Index: {currentPlayerIndex}</div>
            <div>Game Current Player: {gameState?.currentPlayer}</div>
            <div>Is My Turn: {gameState?.currentPlayer === currentPlayerIndex ? 'Yes' : 'No'}</div>
            <div>Game Initialized: {isGameInitialized ? 'Yes' : 'No'}</div>
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
