import Link from 'next/link';
import type { Metadata } from 'next';

import { compareClassicAndMarketRounds, type MarketComparisonSummary } from '@/lib/game-core';
import type { GameConfig } from '@/lib/game-core';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '仕込み市場 検証レポート',
  description: 'クラシックモデルと仕込み市場モデルの初期比較レポート。',
};

type SearchParams = Record<string, string | string[] | undefined>;

type VariantReport = {
  id: string;
  label: string;
  extraCards: number;
  summary: MarketComparisonSummary;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function readNumber(
  params: SearchParams,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = Number(firstValue(params[key]));
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(raw)));
}

function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function signed(value: number, digits = 2): string {
  const formatted = formatNumber(value, digits);
  return value > 0 ? `+${formatted}` : formatted;
}

function sampled(
  sampleCount: number,
  value: number,
  formatter: (value: number) => string = formatNumber,
): string {
  return sampleCount === 0 ? 'n/a' : formatter(value);
}

function sampledPair(
  sampleCount: number,
  before: number,
  after: number,
  formatter: (value: number) => string,
): string {
  return sampleCount === 0 ? 'n/a' : `${formatter(before)} -> ${formatter(after)}`;
}

function getMiddleOnlyRescueDelta(summary: MarketComparisonSummary): number {
  return summary.middleOnlySampleCount === 0
    ? summary.weakHandAveragePenaltyMarket - summary.weakHandAveragePenaltyClassic
    : summary.middleOnlyPenaltyDelta;
}

function getVariantTone(summary: MarketComparisonSummary): 'good' | 'watch' | 'neutral' {
  const weakDelta = summary.weakHandAveragePenaltyMarket - summary.weakHandAveragePenaltyClassic;
  const rescueDelta = getMiddleOnlyRescueDelta(summary);
  const correlationDelta = summary.marketRiskPenaltyCorrelation - summary.classicRiskPenaltyCorrelation;

  if (rescueDelta < 0 && weakDelta <= 0 && correlationDelta <= 0.03) return 'good';
  if (rescueDelta > 0 || weakDelta > 0 || correlationDelta > 0.08) return 'watch';
  return 'neutral';
}

function getVariantNote(summary: MarketComparisonSummary): string {
  const weakDelta = summary.weakHandAveragePenaltyMarket - summary.weakHandAveragePenaltyClassic;
  const rescueDelta = getMiddleOnlyRescueDelta(summary);
  const correlationDelta = summary.marketRiskPenaltyCorrelation - summary.classicRiskPenaltyCorrelation;

  if (summary.middleOnlySampleCount === 0) {
    return 'この条件では中間札だけの手札サンプルがありません。試行回数を増やして確認してください。';
  }
  if (rescueDelta < 0 && weakDelta <= 0 && correlationDelta <= 0.03) {
    return '中間札事故の失点を下げつつ、初期手札依存も強めすぎていません。';
  }
  if (rescueDelta > 0) {
    return '中間札だけの手札の平均失点が上がっています。救済ルールとしては要注意です。';
  }
  if (weakDelta > 0) {
    return '事故手札の平均失点が上がっています。CPU判断か市場枚数の再調整候補です。';
  }
  if (correlationDelta > 0.08) {
    return '初期手札の強弱と失点の結びつきが強まっています。強者加速に注意です。';
  }
  return '大きな崩れはありませんが、本採用判断には追加試行が必要です。';
}

function buildHref(params: {
  iterations: number;
  players: number;
  seed: number;
}): string {
  const query = new URLSearchParams({
    iterations: String(params.iterations),
    players: String(params.players),
    seed: String(params.seed),
  });
  return `/cucumber/market-lab?${query.toString()}`;
}

function createConfig(players: number): GameConfig {
  return {
    ruleSet: 'classic',
    players,
    turnSeconds: null,
    maxCucumbers: 999,
    initialCards: 7,
    cpuLevel: 'easy',
  };
}

function MetricCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className={styles.metricCell}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{hint}</span>
    </div>
  );
}

function VariantCard({ report }: { report: VariantReport }) {
  const { summary } = report;
  const weakDelta = summary.weakHandAveragePenaltyMarket - summary.weakHandAveragePenaltyClassic;
  const tone = getVariantTone(summary);
  const middleOnlyDelta = sampled(summary.middleOnlySampleCount, summary.middleOnlyPenaltyDelta, signed);

  return (
    <article className={`${styles.variantCard} ${styles[`variantCard_${tone}`]}`}>
      <header className={styles.variantHeader}>
        <div>
          <p>MARKET SIZE</p>
          <h2>{report.label}</h2>
        </div>
        <span>{summary.iterations} runs</span>
      </header>

      <div className={styles.variantGrid}>
        <MetricCell
          label="平均失点差"
          value={signed(summary.marketPenaltyDeltaPerPlayer)}
          hint="市場 - クラシック。低いほどよい"
        />
        <MetricCell
          label="事故手札の差"
          value={signed(weakDelta)}
          hint="事故手札だけの平均失点差"
        />
        <MetricCell
          label="交換参加率"
          value={formatPercent(summary.exchangeParticipationRate)}
          hint="CPUが交換を選んだ割合"
        />
        <MetricCell
          label="交換順1位の失点"
          value={formatNumber(summary.exchangeLeaderAveragePenalty)}
          hint="強い入札者が得しすぎるか"
        />
        <MetricCell
          label="中間事故の失点差"
          value={middleOnlyDelta}
          hint="4〜12だけの手札。市場 - クラシック"
        />
        <MetricCell
          label="中間事故の無失点率"
          value={sampledPair(
            summary.middleOnlySampleCount,
            summary.middleOnlyZeroPenaltyRateClassic,
            summary.middleOnlyZeroPenaltyRateMarket,
            formatPercent,
          )}
          hint="クラシック -> 市場"
        />
        <MetricCell
          label="読み合い候補率"
          value={formatPercent(summary.contestedExchangeRoundRate)}
          hint="2人以上が交換に参加したラウンド"
        />
        <MetricCell
          label="既知手札率"
          value={formatPercent(summary.knownCurrentCardShareAfterMarket)}
          hint="市場取得で現在手札が見える割合"
        />
      </div>

      <p className={styles.variantNote}>{getVariantNote(summary)}</p>
    </article>
  );
}

function ComparisonTable({ reports }: { reports: VariantReport[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>市場枚数</th>
            <th>Classic 平均</th>
            <th>Market 平均</th>
            <th>失点差</th>
            <th>事故相関 Classic</th>
            <th>事故相関 Market</th>
            <th>事故手札 Classic</th>
            <th>事故手札 Market</th>
            <th>中間事故 n</th>
            <th>中間事故差</th>
            <th>中間事故 無失点</th>
            <th>端札回復率</th>
            <th>読み合い候補</th>
            <th>公開情報/回</th>
            <th>既知手札率</th>
            <th>重要札入札</th>
            <th>交換率</th>
          </tr>
        </thead>
        <tbody>
          {reports.map(report => {
            const { summary } = report;
            return (
              <tr key={report.id}>
                <td>{report.label}</td>
                <td>{formatNumber(summary.classicAveragePenaltyPerPlayer)}</td>
                <td>{formatNumber(summary.marketAveragePenaltyPerPlayer)}</td>
                <td>{signed(summary.marketPenaltyDeltaPerPlayer)}</td>
                <td>{formatNumber(summary.classicRiskPenaltyCorrelation)}</td>
                <td>{formatNumber(summary.marketRiskPenaltyCorrelation)}</td>
                <td>{formatNumber(summary.weakHandAveragePenaltyClassic)}</td>
                <td>{formatNumber(summary.weakHandAveragePenaltyMarket)}</td>
                <td>{summary.middleOnlySampleCount}</td>
                <td>{sampled(summary.middleOnlySampleCount, summary.middleOnlyPenaltyDelta, signed)}</td>
                <td>
                  {sampledPair(
                    summary.middleOnlySampleCount,
                    summary.middleOnlyZeroPenaltyRateClassic,
                    summary.middleOnlyZeroPenaltyRateMarket,
                    formatPercent,
                  )}
                </td>
                <td>{sampled(summary.middleOnlySampleCount, summary.middleOnlyEdgeRecoveryRate, formatPercent)}</td>
                <td>{formatPercent(summary.contestedExchangeRoundRate)}</td>
                <td>{formatNumber(summary.publicCardFactsPerRound)}</td>
                <td>{formatPercent(summary.knownCurrentCardShareAfterMarket)}</td>
                <td>{formatPercent(summary.highSignalBidRate)}</td>
                <td>{formatPercent(summary.exchangeParticipationRate)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MarketLabPage({ searchParams = {} }: { searchParams?: SearchParams }) {
  const iterations = readNumber(searchParams, 'iterations', 180, 12, 1200);
  const players = readNumber(searchParams, 'players', 4, 2, 6);
  const seed = readNumber(searchParams, 'seed', 20260719, 1, 99999999);
  const config = createConfig(players);

  const reports: VariantReport[] = [1, 2, 3].map(extraCards => ({
    id: `extra-${extraCards}`,
    label: `人数 + ${extraCards}`,
    extraCards,
    summary: compareClassicAndMarketRounds({
      config,
      iterations,
      seed,
      market: { extraCards },
    }),
  }));

  const recommended = [...reports].sort((a, b) => {
    const aRescueDelta = getMiddleOnlyRescueDelta(a.summary);
    const bRescueDelta = getMiddleOnlyRescueDelta(b.summary);
    return (
      aRescueDelta - bRescueDelta
      || a.summary.marketPenaltyDeltaPerPlayer - b.summary.marketPenaltyDeltaPerPlayer
    );
  })[0];

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>RULE MODEL LAB</p>
            <h1>仕込み市場 検証レポート</h1>
            <p className={styles.lead}>
              同じ乱数シードでクラシックモデルと市場モデルを走らせ、初期手札事故と失点の関係を比較します。
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link href="/cucumber/market-lab/batch">一括検証</Link>
            <Link href="/home">ホーム</Link>
            <Link href="/cucumber/cpu/play">CPU対戦</Link>
          </div>
        </header>

        <section className={styles.controlStrip} aria-label="検証条件">
          <div>
            <span>人数</span>
            <strong>{players}人</strong>
          </div>
          <div>
            <span>試行回数</span>
            <strong>{iterations}</strong>
          </div>
          <div>
            <span>Seed</span>
            <strong>{seed}</strong>
          </div>
          <div>
            <span>暫定推奨</span>
            <strong>{recommended.label}</strong>
          </div>
        </section>

        <nav className={styles.quickLinks} aria-label="検証条件の切替">
          {[2, 3, 4, 5, 6].map(playerCount => (
            <Link
              key={playerCount}
              className={playerCount === players ? styles.activeLink : undefined}
              href={buildHref({ iterations, players: playerCount, seed })}
            >
              {playerCount}人
            </Link>
          ))}
          {[60, 180, 480].map(count => (
            <Link
              key={count}
              className={count === iterations ? styles.activeLink : undefined}
              href={buildHref({ iterations: count, players, seed })}
            >
              {count}回
            </Link>
          ))}
        </nav>

        <section className={styles.variantList} aria-label="市場枚数ごとの比較">
          {reports.map(report => (
            <VariantCard key={report.id} report={report} />
          ))}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>DATA TABLE</p>
              <h2>詳細比較</h2>
            </div>
            <p>この表は市場判断CPUの仮モデルによる結果です。本採用前に人間の感覚と照合します。</p>
          </div>
          <ComparisonTable reports={reports} />
        </section>

        <section className={styles.notes}>
          <h2>次に見るべきところ</h2>
          <ul>
            <li>4〜12だけの中間事故手札が、市場で無失点になりやすくなっているか</li>
            <li>中間事故手札が市場で1〜3または13〜15を取り戻せているか</li>
            <li>2人以上が交換に参加するラウンドが十分あり、読み合いの入口が生まれているか</li>
            <li>市場で取得したカードが見えることで、現在手札の予測が簡単になりすぎていないか</li>
            <li>交換順1位の失点が極端に低くなりすぎていないか</li>
            <li>市場枚数を増やしたとき、交換参加率が高くなりすぎないか</li>
            <li>事故相関が上がる場合、強い初期手札の最適化ルールになっていないか</li>
          </ul>
        </section>
      </section>
    </main>
  );
}
