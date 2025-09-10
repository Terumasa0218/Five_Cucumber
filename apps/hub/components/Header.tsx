'use client';
import { getProfile } from '@/lib/profile';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/** 最小限のヘッダー（固定・最小限） */
export default function Header(){
  const pathname = usePathname();
  const [profile, setProfile] = useState(getProfile());
  
  useEffect(() => {
    // プロフィール変更を監視
    const handleStorageChange = () => {
      setProfile(getProfile());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 flex items-center justify-between py-4">
        {/* 左：タイトル */}
        <Link href="/home" className="text-xl font-bold text-gray-800 hover:text-blue-600">
          5本のきゅうり
        </Link>

        {/* 右：ユーザー名表示 */}
        <div className="text-sm text-gray-600">
          {profile?.nickname || 'ゲスト'}
        </div>
      </div>
    </header>
  );
}