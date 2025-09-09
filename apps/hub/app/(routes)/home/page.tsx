import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-[calc(100svh-64px)] grid place-items-center p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Link href="/lobby/cucumber5" className="group block rounded-2xl p-8 bg-[var(--paper)] shadow hover:shadow-lg transition">
          <h2 className="text-2xl mb-2" style={{color:"var(--cuke)"}}>オンライン対戦</h2>
          <p className="text-sm" style={{color:"var(--ink)"}}>ルーム作成/参加で友だちと遊ぶ</p>
        </Link>
        <Link href="/play/cucumber5?mode=cpu&players=4&hand=7&think=15&cuke=6" className="group block rounded-2xl p-8 bg-[var(--paper)] shadow hover:shadow-lg transition">
          <h2 className="text-2xl mb-2" style={{color:"var(--brass)"}}>CPU対戦</h2>
          <p className="text-sm" style={{color:"var(--ink)"}}>デフォルト設定ですぐに開始</p>
        </Link>
      </div>
      <div className="mt-8 opacity-70 text-sm">
        {/* TODO: 詳細設定ページ/モーダルへの導線（今はダミーでOK） */}
      </div>
    </main>
  );
}