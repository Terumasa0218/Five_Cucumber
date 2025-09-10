'use client';

import FriendsList from '@/components/FriendsList';
import { useAuth } from "@/providers/AuthProvider";
import { getSessionMode, getRedirectUrl } from '@/app/lib/session';
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [sessionMode, setSessionMode] = useState<'user' | 'guest' | null>(null);
  
  useEffect(() => {
    setMounted(true);
    setSessionMode(getSessionMode());
  }, []);
  
  // Show loading state while auth is initializing
  if (!mounted || loading) {
    return (
      <main className="bg-home min-h-[100svh] flex items-center justify-center px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </main>
    );
  }
  
  const canFriends = sessionMode === 'user';
  const friendsUrl = '/lobby/cucumber5?mode=friends';
  const friendsRedirectUrl = getRedirectUrl(friendsUrl);
  return (
    <main className="bg-home min-h-[100svh] flex items-center justify-center px-4 py-12">
      {/* 背景フレームの中心に3CTAを置く */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_0.8fr] gap-8">
        {/* 左：メニュー（縦並び＋三角マーク） */}
        <ul className="space-y-5">
          <li>
            <Link href="/play/cucumber5?mode=cpu&players=4&hand=7&think=15&cuke=6"
              className="link-reset group flex items-start gap-3">
              <span className="mt-1 text-lg select-none">▶</span>
              <div className="rounded-2xl border border-[color:var(--paper-edge)] bg-[color:var(--paper)]/92 p-6 shadow group-hover:shadow-lg transition">
                <h2 className="text-xl md:text-2xl" style={{color:"var(--cuke)"}}>CPU対戦</h2>
                <p className="text-sm opacity-80" style={{color:"var(--ink)"}}>既定値ですぐに開始</p>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/lobby/cucumber5?mode=public" className="link-reset group flex items-start gap-3">
              <span className="mt-1 text-lg select-none">▶</span>
              <div className="rounded-2xl border border-[color:var(--paper-edge)] bg-[color:var(--paper)]/92 p-6 shadow group-hover:shadow-lg transition">
                <h2 className="text-xl md:text-2xl" style={{color:"var(--cuke)"}}>オンライン対戦</h2>
                <p className="text-sm opacity-80" style={{color:"var(--ink)"}}>ランダムマッチ（準備中）</p>
              </div>
            </Link>
          </li>
          <li>
            {canFriends ? (
              <Link href={friendsUrl} className="link-reset group flex items-start gap-3">
                <span className="mt-1 text-lg select-none">▶</span>
                <div className="rounded-2xl border border-[color:var(--paper-edge)] bg-[color:var(--paper)]/92 p-6 shadow group-hover:shadow-lg transition">
                  <h2 className="text-xl md:text-2xl" style={{color:"var(--brass)"}}>フレンド対戦</h2>
                  <p className="text-sm opacity-80" style={{color:"var(--ink)"}}>フレンドと対戦</p>
                </div>
              </Link>
            ) : (
              <Link href={friendsRedirectUrl} className="link-reset group flex items-start gap-3">
                <span className="mt-1 text-lg select-none">▶</span>
                <div className="rounded-2xl border border-[color:var(--paper-edge)] bg-[color:var(--paper)]/50 p-6 shadow opacity-60">
                  <h2 className="text-xl md:text-2xl" style={{color:"var(--brass)"}}>フレンド対戦</h2>
                  <p className="text-sm opacity-80" style={{color:"var(--ink)"}}>※ ログインすると利用できます</p>
                </div>
              </Link>
            )}
          </li>
        </ul>
        {/* 右：フレンド一覧（ユーザー名下に表示） */}
        <aside className="rounded-2xl border border-[color:var(--paper-edge)] bg-[color:var(--paper)]/92 p-5 shadow">
          <FriendsList />
        </aside>
      </div>
    </main>
  );
}