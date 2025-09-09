'use client';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';

export function Header() {
  const { user, signout } = useAuth();

  const handleSignout = async () => {
    await signout();
    window.location.href = '/auth/login';
  };

  return (
    <header className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/home"
            className="text-2xl font-bold text-amber-800 hover:text-amber-900"
          >
            Game Hub
          </Link>
          <nav className="flex items-center space-x-4">
            <Link
              href="/home"
              className="text-amber-700 hover:text-amber-800 px-3 py-2 rounded-md text-sm font-medium"
            >
              ホーム
            </Link>
            <div className="flex items-center space-x-3">
              <span className="text-amber-700 text-sm">
                {user?.displayName ?? 'ゲスト'}
              </span>
              <button
                onClick={handleSignout}
                className="text-amber-700 hover:text-amber-800 px-3 py-2 rounded-md text-sm font-medium"
              >
                サインアウト
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}