'use client';

import { useAuth } from "@/providers/AuthProvider";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // During SSR or before mounting, assume user is not available
  const canFriends = mounted && !!user && !user.isAnonymous;
  return (
    <main className="bg-home min-h-[100svh] flex items-center justify-center px-4 py-12">
      {/* 背景フレームの中心に3CTAを置く */}
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <Link
          href="/play/cucumber5?mode=cpu&players=4&hand=7&think=15&cuke=6"
          className="link-reset rounded-2xl border border-[color:var(--paper-edge)] bg-[color:var(--paper)]/92 p-8 shadow hover:shadow-lg transition-transform hover:-translate-y-0.5"
        >
          <h2 className="text-xl md:text-2xl mb-1" style={{color:"var(--cuke)"}}>CPU対戦</h2>
          <p className="text-sm opacity-80" style={{color:"var(--ink)"}}>既定値ですぐに開始</p>
        </Link>

        <Link
          href="/lobby/cucumber5?mode=public"
          className="link-reset rounded-2xl border border-[color:var(--paper-edge)] bg-[color:var(--paper)]/92 p-8 shadow hover:shadow-lg transition-transform hover:-translate-y-0.5"
        >
          <h2 className="text-xl md:text-2xl mb-1" style={{color:"var(--cuke)"}}>オンライン対戦</h2>
          <p className="text-sm opacity-80" style={{color:"var(--ink)"}}>ランダムマッチ（準備中）</p>
        </Link>

        <Link
          href="/lobby/cucumber5?mode=friends"
          className={`link-reset rounded-2xl border border-[color:var(--paper-edge)] bg-[color:var(--paper)]/92 p-8 shadow transition-transform hover:-translate-y-0.5 aria-disabled:opacity-50 ${
            canFriends ? 'hover:shadow-lg' : 'pointer-events-none cursor-not-allowed opacity-50'
          }`}
          aria-disabled={!canFriends}
        >
          <h2 className="text-xl md:text-2xl mb-1" style={{color:"var(--brass)"}}>フレンド対戦</h2>
          <p className="text-sm opacity-80" style={{color:"var(--ink)"}}>
            {canFriends ? 'コードを作成/入力して遊ぶ' : 'ログインすると利用できます'}
          </p>
        </Link>
      </div>
    </main>
  );
}