'use client';

import { GameTile } from '@/components/GameTile';
import { PresenceBadge } from '@/components/PresenceBadge';
import { useAuth } from '@/providers/AuthProvider';
import { useI18n } from '@/providers/I18nProvider';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function HomePage() {
  const [playerCount, setPlayerCount] = useState(4);
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handlePlayGame = (gameId: string) => {
    router.push(`/lobby/${gameId}`);
  };

  const availableGames = [
    {
      id: 'cucumber5',
      name: t('title.cucumber5'),
      description: t('tutorial.goal'),
      icon: '🥒',
      minPlayers: 2,
      maxPlayers: 6,
      supportsCPU: true,
      supportsOnline: true
    }
  ];

  return (
    <div className="home-page">
      <div className="container">
        <div className="home-header">
          <div className="home-welcome">
            <h1>{t('msg.welcome', { name: user?.displayName || 'Guest' })}</h1>
            <PresenceBadge />
          </div>
          
          <div className="home-actions">
            <button
              className="btn btn--small"
              onClick={handleSignOut}
            >
              {t('btn.logout')}
            </button>
          </div>
        </div>

        <div className="home-content">
          <div className="home-filters">
            <div className="filter-group">
              <label htmlFor="playerCount" className="filter-label">
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
          </div>

          <div className="games-grid">
            {availableGames
              .filter(game => playerCount >= game.minPlayers && playerCount <= game.maxPlayers)
              .map(game => (
                <GameTile
                  key={game.id}
                  game={game}
                  playerCount={playerCount}
                  onPlay={() => handlePlayGame(game.id)}
                />
              ))}
          </div>

          {availableGames.filter(game => 
            playerCount >= game.minPlayers && playerCount <= game.maxPlayers
          ).length === 0 && (
            <div className="no-games">
              <p>{t('msg.noGamesAvailable')}</p>
              <p>Try adjusting the player count.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
