import Link from 'next/link';
import type { Metadata } from 'next';

import {
  compareMarketBatch,
  type MarketBatchExtraSummary,
  type MarketBatchReport,
} from '@/lib/game-core';
import type { GameConfig } from '@/lib/game-core';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '仕込み市場 一括検証',
  description: '人数別、市場枚数別に仕込み市場モデルを一括比較する検証レポート。',
};

type SearchParams = Record<string, string | string[] | undefined>;

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

function sampled(sampleCount: number, value: number, formatter: (value: number) => string): string {
  return sampleCount === 0 ? 'n/a' : formatter(value);
}

function buildHref(params: { iterations: number; seed: number }): string {
  const query = new URLSearchParams({
    iterations: String(params.iterations),
    seed: String(params.seed),
  });
  return `/cucumber/market-lab/batch?${query.toString()}`;
}

function buildSingleHref(report: MarketBatchReport, iterations: number, seed: number): string {
  const query = new URLSearchParams({
    players: String(report.players),
    iterations: String(iterations),
    seed: String(seed),
  });
  return `/cucumber/market-lab?${query.toString()}`;
}

function createConfig(): Omit<GameConfig, 'players'> {
  return {
    ruleSet: 'classic',
    turnSeconds: null,
    maxCucumbers: 999,
    initialCards: 7,
    cpuLevel: 'easy',
  };
}

function getVerdictLabel(verdict: MarketBatchReport['verdict']): string {
  if (verdict === 'strong') return '有力';
  if (verdict === 'weak') return '要再考';
  return '観察';
}

function getVerdictNote(report: MarketBatchReport): string {
  if (report.verdict === 'strong') {
    return '中間事故の救済と情報量のバランスが比較的良い候補です。';
  }
  if (report.verdict === 'weak') {
    return '救済不足、情報漏れ、または交換順1位の優位が強い候補です。';
  }
  return '採用判断にはseed違いとCPU判断重みの追加確認が必要です。';
}

function SummaryCard({ summary }: { summary: MarketBatchExtraSummary }) {
  return (
    <article className={styles.summaryCard}>
      <header className={styles.variantHeader}>
        <div>
          <p>MARKET SIZE</p>
          <h2>{summary.label}</h2>
        </div>
        <span>score {formatNumber(summary.averageEvaluationScore)}</span>
      </header>

      <div className={styles.summaryGrid}>
        <div>
          <span>中間事故 失点差</span>
          <strong>{signed(summary.averageMiddleOnlyPenaltyDelta)}</strong>
        </div>
        <div>
          <span>中間事故 無失点差</span>
          <strong>{signed(summary.averageMiddleOnlyZeroPenaltyDelta * 100, 0)}pt</strong>
        </div>
        <div>
          <span>端札回復率</span>
          <strong>{formatPercent(summary.averageMiddleOnlyEdgeRecoveryRate)}</strong>
        </div>
        <div>
          <span>読み合い候補</span>
          <strong>{formatPercent(summary.averageContestedExchangeRoundRate)}</strong>
        </div>
        <div>
          <span>既知手札率</span>
          <strong>{formatPercent(summary.averageKnownCurrentCardShare)}</strong>
        </div>
        <div>
          <span>交換順1位優位</span>
          <strong>{signed(summary.averageExchangeLeaderAdvantage)}</strong>
        </div>
      </div>
    </article>
  );
}

function BatchTable({
  reports,
  iterations,
  seed,
}: {
  reports: MarketBatchReport[];
  iterations: number;
  seed: number;
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>条件</th>
            <th>判定</th>
            <th>スコア</th>
            <th>中間事故 n</th>
            <th>中間事故差</th>
            <th>中間事故 無失点</th>
            <th>端札回復率</th>
            <th>読み合い候補</th>
            <th>交換人数/回</th>
            <th>公開情報/回</th>
            <th>既知手札率</th>
            <th>重要札入札</th>
            <th>交換順1位優位</th>
            <th>詳細</th>
          </tr>
        </thead>
        <tbody>
          {reports.map(report => {
            const { summary } = report;

            return (
              <tr key={`${report.players}-${report.extraCards}`}>
                <td>{report.label}</td>
                <td>
                  <span className={`${styles.verdict} ${styles[`verdict_${report.verdict}`]}`}>
                    {getVerdictLabel(report.verdict)}
                  </span>
                </td>
                <td>{formatNumber(report.evaluationScore)}</td>
                <td>{summary.middleOnlySampleCount}</td>
                <td>{sampled(summary.middleOnlySampleCount, summary.middleOnlyPenaltyDelta, signed)}</td>
                <td>
                  {sampled(
                    summary.middleOnlySampleCount,
                    report.middleOnlyZeroPenaltyDelta,
                    value => `${signed(value * 100, 0)}pt`,
                  )}
                </td>
                <td>{sampled(summary.middleOnlySampleCount, summary.middleOnlyEdgeRecoveryRate, formatPercent)}</td>
                <td>{formatPercent(summary.contestedExchangeRoundRate)}</td>
                <td>{formatNumber(summary.averageBiddersPerMarketRound)}</td>
                <td>{formatNumber(summary.publicCardFactsPerRound)}</td>
                <td>{formatPercent(summary.knownCurrentCardShareAfterMarket)}</td>
                <td>{formatPercent(summary.highSignalBidRate)}</td>
                <td>{signed(report.exchangeLeaderAdvantage)}</td>
                <td>
                  <Link href={buildSingleHref(report, iterations, seed)}>単発</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MarketBatchPage({ searchParams = {} }: { searchParams?: SearchParams }) {
  const iterations = readNumber(searchParams, 'iterations', 480, 24, 1200);
  const seed = readNumber(searchParams, 'seed', 20260719, 1, 99999999);
  const result = compareMarketBatch({
    config: createConfig(),
    iterations,
    seed,
  });
  const reports = [...result.reports].sort(
    (a, b) => a.players - b.players || a.extraCards - b.extraCards,
  );

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>RULE MODEL LAB</p>
            <h1>仕込み市場 一括検証</h1>
            <p className={styles.lead}>
              2〜6人と市場枚数をまとめて回し、中間事故救済と情報公開リスクの両方から候補を絞ります。
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link href="/cucumber/market-lab">単発検証</Link>
            <Link href="/home">ホーム</Link>
          </div>
        </header>

        <section className={styles.controlStrip} aria-label="一括検証条件">
          <div>
            <span>人数</span>
            <strong>2〜6人</strong>
          </div>
          <div>
            <span>市場枚数</span>
            <strong>+1 / +2 / +3</strong>
          </div>
          <div>
            <span>試行回数</span>
            <strong>{iterations}</strong>
          </div>
          <div>
            <span>全体推奨</span>
            <strong>{result.recommendedExtraCards.label}</strong>
          </div>
        </section>

        <nav className={styles.quickLinks} aria-label="一括検証条件の切替">
          {[180, 480, 1200].map(count => (
            <Link
              key={count}
              className={count === iterations ? styles.activeLink : undefined}
              href={buildHref({ iterations: count, seed })}
            >
              {count}回
            </Link>
          ))}
          {[20260719, 20260720, 20260721].map(seedValue => (
            <Link
              key={seedValue}
              className={seedValue === seed ? styles.activeLink : undefined}
              href={buildHref({ iterations, seed: seedValue })}
            >
              seed {seedValue}
            </Link>
          ))}
        </nav>

        <section className={styles.summaryList} aria-label="市場枚数別の全体比較">
          {result.byExtraCards.map(summary => (
            <SummaryCard key={summary.extraCards} summary={summary} />
          ))}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>BATCH MATRIX</p>
              <h2>人数別マトリクス</h2>
            </div>
            <p>
              判定は仮スコアです。中間事故の救済を重視しつつ、相手の現在手札が見えすぎる候補を減点しています。
            </p>
          </div>
          <BatchTable reports={reports} iterations={iterations} seed={seed} />
        </section>

        <section className={styles.notes}>
          <h2>採用候補を見る基準</h2>
          <ul>
            <li>中間事故手札の平均失点差が0以下になっているか</li>
            <li>中間事故手札の無失点率が下がっていないか</li>
            <li>端札回復率があり、救済が実際に手札構造へ効いているか</li>
            <li>2人以上が交換に入る割合があり、読み合いの入口が残っているか</li>
            <li>既知手札率と公開情報量が高すぎず、推測が簡単になりすぎていないか</li>
            <li>交換順1位の失点だけが極端に低くなっていないか</li>
          </ul>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>CURRENT READ</p>
              <h2>{result.recommendedExtraCards.label} を先に見る</h2>
            </div>
            <p>
              {result.recommendedExtraCards.label}
              は、このseedと試行回数では一括スコアが最も高い候補です。各人数での判定を確認し、
              seed違いでも同じ傾向が出るかを次に見ます。
            </p>
          </div>
          <div className={styles.criteriaGrid}>
            {result.recommendedExtraCards.reports.map(report => (
              <article key={report.players}>
                <span>{report.players}人</span>
                <strong>{getVerdictLabel(report.verdict)}</strong>
                <p>{getVerdictNote(report)}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
