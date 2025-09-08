'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useTranslation } from 'react-i18next';
import { PresenceBadge } from '@/components/PresenceBadge';

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const gameId = params.gameId as string;
  const [roomCode, setRoomCode] = useState('');
  const [playerCount, setPlayerCount] = useState(4);
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  };

  const handleCreateRoom = async () => {
    setIsCreatingRoom(true);
    
    try {
      const code = generateRoomCode();
      setRoomCode(code);
      
      // TODO: Create room in Firebase
      console.log('Creating room:', code);
      
      // For now, start CPU game directly
      setTimeout(() => {
        router.push(`/play/${gameId}?mode=cpu&players=${playerCount}&difficulty=${difficulty}`);
      }, 1000);
    } catch (error) {
      console.error('Failed to create room:', error);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) return;
    
    setIsJoiningRoom(true);
    
    try {
      // TODO: Join room in Firebase
      console.log('Joining room:', roomCode);
      
      // For now, redirect to play page
      router.push(`/play/${gameId}?mode=online&room=${roomCode}`);
    } catch (error) {
      console.error('Failed to join room:', error);
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handlePlayCPU = () => {
    router.push(`/play/${gameId}?mode=cpu&players=${playerCount}&difficulty=${difficulty}`);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    // TODO: Show toast notification
  };

  return (
    <div className="lobby-page">
      <div className="container">
        <div className="lobby-header">
          <h1>{t('title.lobby')}</h1>
          <PresenceBadge />
        </div>

        <div className="lobby-content">
          <div className="lobby-options">
            <div className="option-group">
              <label htmlFor="playerCount" className="option-label">
                {t('label.playerCount')}
              </label>
              <select
                id="playerCount"
                className="input"
                value={playerCount}
                onChange={(e) => setPlayerCount(parseInt(e.target.value))}
              >
                <option value={2}>2 {t('label.players')}</option>
                <option value={3}>3 {t('label.players')}</option>
                <option value={4}>4 {t('label.players')}</option>
                <option value={5}>5 {t('label.players')}</option>
                <option value={6}>6 {t('label.players')}</option>
              </select>
            </div>

            <div className="option-group">
              <label htmlFor="difficulty" className="option-label">
                CPU Difficulty
              </label>
              <select
                id="difficulty"
                className="input"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
              >
                <option value="easy">Easy</option>
                <option value="normal">Normal</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="lobby-actions">
            <div className="action-section">
              <h3>Play vs CPU</h3>
              <p>Play against computer opponents</p>
              <button
                className="btn btn--primary btn--large"
                onClick={handlePlayCPU}
              >
                {t('btn.playCpu')}
              </button>
            </div>

            <div className="action-section">
              <h3>Create Room</h3>
              <p>Create a room for online multiplayer</p>
              <button
                className="btn btn--large"
                onClick={handleCreateRoom}
                disabled={isCreatingRoom}
              >
                {isCreatingRoom ? (
                  <div className="loading-spinner" />
                ) : (
                  t('btn.createRoom')
                )}
              </button>
              
              {roomCode && (
                <div className="room-code">
                  <p>{t('msg.roomCode', { code: roomCode })}</p>
                  <button
                    className="btn btn--small"
                    onClick={copyRoomCode}
                  >
                    Copy Code
                  </button>
                </div>
              )}
            </div>

            <div className="action-section">
              <h3>Join Room</h3>
              <p>Join an existing room with a code</p>
              <div className="join-form">
                <input
                  type="text"
                  className="input"
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={5}
                />
                <button
                  className="btn btn--large"
                  onClick={handleJoinRoom}
                  disabled={isJoiningRoom || !roomCode.trim()}
                >
                  {isJoiningRoom ? (
                    <div className="loading-spinner" />
                  ) : (
                    t('btn.joinRoom')
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="lobby-footer">
            <button
              className="btn"
              onClick={() => router.push('/home')}
            >
              {t('btn.backToLobby')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
