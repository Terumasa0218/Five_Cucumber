"use client";

import { BackgroundFrame } from '@/components/ui';
import { useEffect, useState } from 'react';

interface BattleLayoutProps {
  children: React.ReactNode;
  className?: string;
  showOrientationHint?: boolean;
}

export default function BattleLayout({ children, className, showOrientationHint }: BattleLayoutProps) {
  const [isPortrait, setIsPortrait] = useState(false);

  // 画面向きの監視
  useEffect(() => {
    const checkOrientation = () => {
      const isPortraitMode = window.matchMedia('(orientation: portrait)').matches;
      setIsPortrait(isPortraitMode);
    };

    // 初期チェック
    checkOrientation();

    // リサイズ・回転イベントの監視
    const mediaQuery = window.matchMedia('(orientation: portrait)');
    mediaQuery.addEventListener('change', checkOrientation);
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      mediaQuery.removeEventListener('change', checkOrientation);
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return (
    <BackgroundFrame src="/images/battle1.png" objectPosition="center" priority className={className}>
      {/* 縦向き時の回転案内オーバーレイ（必要時のみ） */}
      {showOrientationHint && isPortrait && (
        <div className="battle-layout__orientation-overlay">
          <div className="battle-layout__orientation-card">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
            <div>横向きにしてプレイしてください</div>
            <div style={{ fontSize: '1rem', marginTop: '1rem', opacity: 0.7 }}>
              画面を回転させてください
            </div>
          </div>
        </div>
      )}

      {/* ステージ */}
      <div className="flex-1 flex flex-col">
        <div className="battle-layout__stage">
          {children}
        </div>
      </div>
    </BackgroundFrame>
  );
}
