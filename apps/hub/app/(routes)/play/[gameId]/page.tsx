'use client';

import { gameLoader } from '@/lib/gameLoader';
import { useAuth } from '@/providers/AuthProvider';
import { useI18n } from '@/providers/I18nProvider';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { t } = useI18n();
  
  const gameId = params.gameId as string;
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameHandleRef = useRef<any>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<any>(null);

  const mode = searchParams.get('mode') || 'cpu';
  const playerCount = parseInt(searchParams.get('players') || '4');
  const difficulty = searchParams.get('difficulty') || 'normal';
  const roomCode = searchParams.get('room');

  useEffect(() => {
    loadGame();
    
    return () => {
      if (gameHandleRef.current) {
        gameHandleRef.current.dispose();
      }
    };
  }, [gameId]);

  const loadGame = async () => {
    if (!gameContainerRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load game module
      const gameModule = await gameLoader.load(gameId);
      
      // Create players
      const players = createPlayers();
      
      // Mount game
      const handle = gameModule.mount(
        gameContainerRef.current,
        {
          players,
          locale: 'ja',
          difficulty: difficulty as any,
          timeLimit: 15
        },
        handleGameEvent
      );

      gameHandleRef.current = handle;
      
      // Start game
      handle.start();
      
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load game:', err);
      setError(t('error.gameNotStarted'));
      setIsLoading(false);
    }
  };

  const createPlayers = () => {
    const players = [];
    
    // Add human player
    players.push({
      id: user?.uid || 'guest',
      name: user?.displayName || 'Guest',
      isCPU: false
    });
    
    // Add CPU players
    for (let i = 1; i < playerCount; i++) {
      players.push({
        id: `cpu-${i}`,
        name: `CPU-${String.fromCharCode(64 + i)}`,
        isCPU: true
      });
    }
    
    return players;
  };

  const handleGameEvent = (event: any) => {
    console.log('Game event:', event);
    
    switch (event.type) {
      case 'match:start':
        setGameState({ phase: 'playing' });
        break;
      case 'match:end':
        setGameState({ phase: 'ended', ...event.data });
        break;
      case 'error':
        setError(event.data?.message || 'Game error occurred');
        break;
    }
  };

  const handleBackToLobby = () => {
    if (gameHandleRef.current) {
      gameHandleRef.current.dispose();
    }
    router.push(`/lobby/${gameId}`);
  };

  const handleNewGame = () => {
    if (gameHandleRef.current) {
      gameHandleRef.current.dispose();
    }
    loadGame();
  };

  if (isLoading) {
    return (
      <div className="play-page">
        <div className="loading">
          <div className="loading-spinner" />
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="play-page">
        <div className="error">
          <div className="error-icon">⚠️</div>
          <h2>Error</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button className="btn btn--primary" onClick={handleNewGame}>
              Try Again
            </button>
            <button className="btn" onClick={handleBackToLobby}>
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="play-page">
      <div className="game-container" ref={gameContainerRef} />
      
      {gameState?.phase === 'ended' && (
        <div className="game-overlay">
          <div className="game-overlay-content">
            <h2>{t('msg.gameOver')}</h2>
            {gameState.winnerIds && (
              <p>Winners: {gameState.winnerIds.join(', ')}</p>
            )}
            <div className="game-overlay-actions">
              <button className="btn btn--primary" onClick={handleNewGame}>
                {t('btn.newGame')}
              </button>
              <button className="btn" onClick={handleBackToLobby}>
                {t('btn.backToLobby')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
