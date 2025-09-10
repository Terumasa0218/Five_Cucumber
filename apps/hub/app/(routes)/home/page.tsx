'use client';

import { getRedirectUrl, getSessionMode } from '@/app/lib/session';
import { useAuth } from "@/providers/AuthProvider";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [sessionMode, setSessionMode] = useState<'user' | 'guest' | null>(null);
  
  useEffect(() => {
    setMounted(true);
    setSessionMode(getSessionMode());
    // ページタイトルを設定
    document.title = 'ホーム | Five Cucumber';
  }, []);
  
  // Show loading state while auth is initializing
  if (!mounted || loading) {
    return (
      <main className="min-h-[100svh] w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--antique-forest)] mx-auto mb-4"></div>
          <p className="font-body text-[var(--antique-muted)]">読み込み中...</p>
        </div>
      </main>
    );
  }
  
  const canFriends = sessionMode === 'user';
  const friendsUrl = '/lobby/cucumber5?mode=friends';
  const friendsRedirectUrl = getRedirectUrl(friendsUrl);
  
  return (
    <main className="min-h-[100svh] w-full pt-20">
      <div className="safe-zone">
        {/* 見出し */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl md:text-5xl text-[var(--antique-ink)] mb-4">
            ホーム
          </h1>
          <p className="font-body text-lg text-[var(--antique-muted)]">
            遊び方を選んでください。
          </p>
        </div>

        {/* モード選択（リストUI） */}
        <div className="max-w-2xl mx-auto space-y-6">
          {/* CPU対戦 */}
          <div className="flex items-center justify-between p-6 bg-white/10 backdrop-blur-sm rounded-lg border border-[var(--antique-border)] hover:bg-white/20 transition-all">
            <div className="flex-1">
              <h2 className="font-heading text-xl text-[var(--antique-ink)] mb-2">
                CPU対戦
              </h2>
              <p className="font-body text-[var(--antique-muted)]">
                既定値ですぐに開始
              </p>
            </div>
            <Link href="/play/cucumber5?mode=cpu&players=4&hand=7&think=15&cuke=6" className="btn-primary">
              はじめる
            </Link>
          </div>

          {/* オンライン対戦 */}
          <div className="flex items-center justify-between p-6 bg-white/5 backdrop-blur-sm rounded-lg border border-[var(--antique-border)] opacity-60">
            <div className="flex-1">
              <h2 className="font-heading text-xl text-[var(--antique-ink)] mb-2">
                オンライン対戦
              </h2>
              <p className="font-body text-[var(--antique-muted)]">
                ランダムマッチ（準備中）
              </p>
            </div>
            <div className="flex items-center">
              <span className="badge">近日公開</span>
            </div>
          </div>

          {/* フレンド対戦 */}
          <div className="flex items-center justify-between p-6 bg-white/10 backdrop-blur-sm rounded-lg border border-[var(--antique-border)] hover:bg-white/20 transition-all">
            <div className="flex-1">
              <h2 className="font-heading text-xl text-[var(--antique-ink)] mb-2">
                フレンド対戦
              </h2>
              <p className="font-body text-[var(--antique-muted)]">
                フレンドを招待して対戦
                {!canFriends && (
                  <span className="block text-sm text-[var(--antique-brass)] mt-1">
                    ※ ログインすると利用できます
                  </span>
                )}
              </p>
            </div>
            {canFriends ? (
              <Link href={friendsUrl} className="btn-primary">
                はじめる
              </Link>
            ) : (
              <Link href={friendsRedirectUrl} className="btn-secondary">
                ログイン
              </Link>
            )}
          </div>
        </div>

        {/* 下部リンク */}
        <div className="text-center mt-12 space-x-6">
          <Link href="/rules/cucumber5" className="btn-link">
            ルール
          </Link>
          {sessionMode !== 'user' && (
            <Link href="/auth/login" className="btn-link">
              ログイン
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}