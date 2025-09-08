'use client';

import { useI18n } from '@/providers/I18nProvider';
import { useEffect, useState } from 'react';

export function PresenceBadge() {
  const { t } = useI18n();
  const [onlineCount, setOnlineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // TODO: Connect to Firebase presence
    // For now, use mock data
    const mockOnlineCount = Math.floor(Math.random() * 50) + 10;
    setOnlineCount(mockOnlineCount);
    setIsConnected(true);

    // Simulate connection status changes
    const interval = setInterval(() => {
      setOnlineCount(prev => prev + Math.floor(Math.random() * 3) - 1);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`presence-badge ${isConnected ? 'presence-badge--connected' : 'presence-badge--disconnected'}`}>
      <div className="presence-badge__indicator" />
      <span className="presence-badge__text">
        {t('label.online')}: {onlineCount}
      </span>
    </div>
  );
}
