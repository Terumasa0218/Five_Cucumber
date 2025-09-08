'use client';

import { Heatmap } from '@/components/Heatmap';
import { PresenceBadge } from '@/components/PresenceBadge';
import { useAuth } from '@/providers/AuthProvider';
import { useI18n } from '@/providers/I18nProvider';
import { useEffect, useState } from 'react';

export default function StatsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<any>(null);
  const [hourlyStats, setHourlyStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    
    try {
      // TODO: Load real stats from Firebase
      // For now, use mock data
      const mockStats = {
        totalMatches: 42,
        winRate: 65.5,
        averageDuration: 8.5,
        mostPlayedGame: 'cucumber5',
        peakHours: [19, 20, 21]
      };
      
      const mockHourlyStats = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        matchCount: Math.floor(Math.random() * 10),
        averageDuration: 5 + Math.random() * 10,
        uniquePlayers: Math.floor(Math.random() * 20)
      }));
      
      setStats(mockStats);
      setHourlyStats(mockHourlyStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="stats-page">
        <div className="loading">
          <div className="loading-spinner" />
          <p>Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-page">
      <div className="container">
        <div className="stats-header">
          <h1>{t('title.stats')}</h1>
          <PresenceBadge />
        </div>

        <div className="stats-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🎮</div>
              <div className="stat-value">{stats?.totalMatches || 0}</div>
              <div className="stat-label">{t('stats.totalGames')}</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🏆</div>
              <div className="stat-value">{stats?.winRate?.toFixed(1) || 0}%</div>
              <div className="stat-label">{t('stats.winRate')}</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-value">{stats?.averageDuration?.toFixed(1) || 0}m</div>
              <div className="stat-label">{t('stats.avgGameTime')}</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🥒</div>
              <div className="stat-value">{stats?.mostPlayedGame || 'N/A'}</div>
              <div className="stat-label">Most Played</div>
            </div>
          </div>

          <div className="stats-section">
            <h2>Activity Heatmap</h2>
            <p>Game activity by hour of day</p>
            <Heatmap data={hourlyStats} />
          </div>

          <div className="stats-section">
            <h2>Peak Hours</h2>
            <p>Most active times: {stats?.peakHours?.map((h: number) => `${h}:00`).join(', ') || 'N/A'}</p>
          </div>

          <div className="stats-section">
            <h2>Recent Activity</h2>
            <div className="recent-activity">
              <div className="activity-item">
                <div className="activity-time">2 hours ago</div>
                <div className="activity-desc">Played Five Cucumbers (4 players)</div>
                <div className="activity-result">Won</div>
              </div>
              <div className="activity-item">
                <div className="activity-time">1 day ago</div>
                <div className="activity-desc">Played Five Cucumbers (3 players)</div>
                <div className="activity-result">Lost</div>
              </div>
              <div className="activity-item">
                <div className="activity-time">2 days ago</div>
                <div className="activity-desc">Played Five Cucumbers (5 players)</div>
                <div className="activity-result">Won</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
