'use client';
import { useAuth } from '@/providers/AuthProvider';
import Link from 'next/link';

export function Header() {
  const { user, signout } = useAuth();

  const handleSignout = async () => {
    await signout();
    window.location.href = '/auth/login';
  };

  return (
    <header className="sticky top-0 z-10 h-16 flex items-center justify-between px-6 md:px-10 border-b backdrop-blur-sm" style={{ background:'color-mix(in oklab, var(--paper) 85%, transparent)', borderColor:'var(--paper-edge)'}}>
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/home"
            className="text-amber-700 hover:text-amber-800 px-3 py-2 rounded-md text-sm font-medium"
          >
            ホーム
          </Link>
          <nav className="flex items-center gap-6 md:gap-10">
            <span className="text-amber-700 text-sm">
              {user?.displayName ?? 'ゲスト'}
            </span>
            <button
              onClick={handleSignout}
              className="text-amber-700 hover:text-amber-800 px-3 py-2 rounded-md text-sm font-medium"
            >
              サインアウト
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}