import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ルール'
};

export default function RulesCucumber5(){
  return (
    <main className="min-h-[100svh] w-full pt-20">
      <div className="safe-zone">
        <article className="max-w-3xl mx-auto">
          <h1 className="font-heading text-4xl md:text-5xl text-[var(--antique-ink)] mb-8 text-center">
            5本のきゅうり：ルール
          </h1>
          <div className="card">
            <ol className="font-body text-[var(--antique-ink)] space-y-4 list-decimal pl-6">
              <li>トリックテイキング。最終トリックで最大カードを出したプレイヤーが「きゅうり」を受け取る。</li>
              <li>きゅうりを5本集めると敗北。詳細は後日追記。{/* TODO: docs から反映 */}</li>
            </ol>
          </div>
        </article>
      </div>
    </main>
  );
}
