'use client';
import { getNickname } from '@/lib/profile';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/** 最小限のヘッダー（固定・最小限） */
export default function Header(){
  const pathname = usePathname();
  // 初期描画時は必ず null（= 未設定表示）で固定し、ハイドレーション差異を防ぐ
  const [nickname, setNickname] = useState<string | null>(null);
  
  useEffect(() => {
    // 初期読み込み（マウント時）
    setNickname(getNickname());

    // プロフィール変更を監視（storage イベント）
    const handleStorageChange = () => {
      setNickname(getNickname());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <header className="header header--antique">
      <div className="header-content">
        {/* 左：タイトル */}
        <div></div>

        {/* 右：ユーザー名表示 */}
        <div className="header-user">
          {nickname ? (
            <span className="header-user__badge">
              {nickname}
            </span>
          ) : (
            <span className="header-user__placeholder">
              未設定
            </span>
          )}
        </div>
      </div>
    </header>
  );
}