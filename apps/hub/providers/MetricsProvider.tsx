'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface MetricsContextType {
  onlineCount: number;
  recordMatchStart: (gameId: string, players: string[]) => void;
  recordMatchEnd: (gameId: string, winnerIds: string[], scores: Record<string, number>) => void;
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const [onlineCount, setOnlineCount] = useState(0);

  const recordMatchStart = (gameId: string, players: string[]) => {
    // TODO: Implement Firebase Analytics
    console.log('Match started:', { gameId, players });
  };

  const recordMatchEnd = (gameId: string, winnerIds: string[], scores: Record<string, number>) => {
    // TODO: Implement Firebase Analytics
    console.log('Match ended:', { gameId, winnerIds, scores });
  };

  useEffect(() => {
    // TODO: Initialize Firebase presence listener
    // For now, simulate online count
    const interval = setInterval(() => {
      setOnlineCount(Math.floor(Math.random() * 50) + 10);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const value = {
    onlineCount,
    recordMatchStart,
    recordMatchEnd,
  };

  return (
    <MetricsContext.Provider value={value}>
      {children}
    </MetricsContext.Provider>
  );
}

export function useMetrics() {
  const context = useContext(MetricsContext);
  if (context === undefined) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return context;
}