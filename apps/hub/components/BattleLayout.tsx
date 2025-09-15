'use client';

import { useEffect, useRef, useState } from 'react';

interface BattleLayoutProps {
  children: React.ReactNode;
}

export default function BattleLayout({ children }: BattleLayoutProps) {
  const [isPortrait, setIsPortrait] = useState(false);
  const [hasTriedOrientationLock, setHasTriedOrientationLock] = useState(false);
  const battleStageRef = useRef<HTMLDivElement>(null);

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

  // スケール計算と適用
  useEffect(() => {
    const updateScale = () => {
      if (!battleStageRef.current) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.min(vw / 1280, vh / 720);
      
      battleStageRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };

    // 初期スケール適用
    updateScale();

    // リサイズ時のスケール更新
    window.addEventListener('resize', updateScale);
    window.addEventListener('orientationchange', updateScale);

    return () => {
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('orientationchange', updateScale);
    };
  }, []);

  // マウント時の処理
  useEffect(() => {
    // 背景とスクロール制御
    document.body.setAttribute('data-bg', 'battle');
    document.body.classList.add('no-scroll');

    return () => {
      // アンマウント時のクリーンアップ
      document.body.removeAttribute('data-bg');
      document.body.classList.remove('no-scroll');
    };
  }, []);

  // 横向きロックの試行（初回タップ時のみ）
  const handleOrientationLock = async () => {
    if (hasTriedOrientationLock) return;
    
    setHasTriedOrientationLock(true);
    
    try {
      // 画面ロックAPIの試行（非対応ブラウザは黙殺）
      if ('orientation' in screen && 'lock' in screen.orientation) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch (error) {
      // ロック失敗は無視（iOS等の制限）
      console.log('Orientation lock not supported or failed');
    }
  };

  return (
    <div className="battle-root" onClick={handleOrientationLock}>
      {/* 縦向き時の回転案内オーバーレイ */}
      {isPortrait && (
        <div className="battle-rotate-overlay">
          <div>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
            <div>横向きにしてプレイしてください</div>
            <div style={{ fontSize: '1rem', marginTop: '1rem', opacity: 0.7 }}>
              画面を回転させてください
            </div>
          </div>
        </div>
      )}
      
      {/* 対戦ステージ */}
      <div 
        ref={battleStageRef}
        className={`battle-stage ${isPortrait ? 'hide-when-portrait' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}
