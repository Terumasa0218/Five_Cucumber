export default function RulesCucumber5(){
  return (
    <main className="bg-home min-h-[100svh] px-4 py-12 flex items-start justify-center">
      <article className="w-full max-w-3xl rounded-2xl border border-[color:var(--paper-edge)] bg-[color:var(--paper)]/92 p-6 shadow">
        <h1 className="text-2xl mb-3" style={{color:'var(--cuke)'}}>5本のきゅうり：ルール（ドラフト）</h1>
        <ol className="list-decimal pl-6 space-y-2" style={{color:'var(--ink)'}}>
          <li>トリックテイキング。最終トリックで最大カードを出したプレイヤーが「きゅうり」を受け取る。</li>
          <li>きゅうりを5本集めると敗北。詳細は後日追記。{/* TODO: docs から反映 */}</li>
        </ol>
      </article>
    </main>
  );
}
