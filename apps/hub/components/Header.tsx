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
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent border-b border-gray-200/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 flex items-center justify-between py-4">
        {/* 左：タイトル */}
        <div></div>

        {/* 右：ユーザー名表示 */}
        <div className="text-sm text-gray-600">
          {nickname || '未設定'}
        </div>
      </div>
    </header>
  );
}