import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";

export default function Home() {
  const { user } = useAuth();
  const canFriends = !!user && !user.isAnonymous;
  return (
    <main className="min-h-[calc(100svh-64px)] grid place-items-center p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        <Link href="/play/cucumber5?mode=cpu&players=4&hand=7&think=15&cuke=6"
          className="rounded-2xl p-8 bg-[var(--paper)] shadow hover:shadow-lg transition">
          <h2 className="text-2xl mb-2" style={{color:"var(--cuke)"}}>CPU対戦</h2>
          <p className="text-sm" style={{color:"var(--ink)"}}>既定値ですぐに開始</p>
        </Link>

        <Link href="/lobby/cucumber5?mode=public"
          className="rounded-2xl p-8 bg-[var(--paper)] shadow hover:shadow-lg transition">
          <h2 className="text-2xl mb-2" style={{color:"var(--cuke)"}}>オンライン対戦</h2>
          <p className="text-sm" style={{color:"var(--ink)"}}>ランダムマッチ（準備中）</p>
        </Link>

        <Link href="/lobby/cucumber5?mode=friends"
          className={`rounded-2xl p-8 bg-[var(--paper)] shadow transition ${
            canFriends ? 'hover:shadow-lg' : 'pointer-events-none cursor-not-allowed opacity-50'
          }`}
          aria-disabled={!canFriends}>
          <h2 className="text-2xl mb-2" style={{color:"var(--brass)"}}>フレンド対戦</h2>
          <p className="text-sm" style={{color:"var(--ink)"}}>
            {canFriends ? 'コードを作成/入力して遊ぶ' : 'ログインすると利用できます'}
          </p>
        </Link>
      </div>
    </main>
  );
}