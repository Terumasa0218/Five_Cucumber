import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  compareMarketBatch,
  type MarketBatchReport,
  type MarketBatchResult,
} from '../lib/game-core/market-batch';
import type { GameConfig } from '../lib/game-core/types';

type Verdict = MarketBatchReport['verdict'];

interface VerdictCounts {
  strong: number;
  watch: number;
  weak: number;
}

interface AggregatedCell {
  players: number;
  extraCards: number;
  label: string;
  runs: number;
  verdictCounts: VerdictCounts;
  marketPenaltyDeltaPerPlayer: number;
  middleOnlySampleCount: number;
  middleOnlyHandRate: number;
  middleOnlyPenaltyDelta: number;
  middleOnlyZeroPenaltyDelta: number;
  middleOnlyEdgeRecoveryRate: number;
  exchangeParticipationRate: number;
  contestedExchangeRoundRate: number;
  averageBiddersPerMarketRound: number;
  knownCurrentCardShareAfterMarket: number;
  highSignalBidRate: number;
  exchangeLeaderAdvantage: number;
  evaluationScore: number;
}

interface AggregatedExtra {
  extraCards: number;
  label: string;
  verdictCounts: VerdictCounts;
  averageMarketPenaltyDeltaPerPlayer: number;
  averageMiddleOnlySampleCount: number;
  averageMiddleOnlyHandRate: number;
  averageMiddleOnlyPenaltyDelta: number;
  averageMiddleOnlyZeroPenaltyDelta: number;
  averageMiddleOnlyEdgeRecoveryRate: number;
  averageExchangeParticipationRate: number;
  averageContestedExchangeRoundRate: number;
  averageBiddersPerMarketRound: number;
  averageKnownCurrentCardShare: number;
  averageHighSignalBidRate: number;
  averageExchangeLeaderAdvantage: number;
  averageEvaluationScore: number;
}

interface AggregatedReport {
  generatedAt: string;
  reportDate: string;
  iterationsPerSeed: number;
  seeds: number[];
  players: number[];
  extraCards: number[];
  totalRoundPairsPerCell: number;
  totalRoundPairs: number;
  cells: AggregatedCell[];
  byExtraCards: AggregatedExtra[];
  recommendedExtraCards: AggregatedExtra;
  caveats: string[];
}

interface ReportPayload {
  options: {
    config: Omit<GameConfig, 'players'>;
    iterationsPerSeed: number;
    seeds: number[];
    players: number[];
    extraCards: number[];
  };
  aggregate: AggregatedReport;
  runs: MarketBatchResult[];
}

const DEFAULT_ITERATIONS = 480;
const DEFAULT_SEEDS = [20260719, 20260720, 20260721];
const DEFAULT_PLAYERS = [2, 3, 4, 5, 6];
const DEFAULT_EXTRA_CARDS = [1, 2, 3];
const TIME_ZONE = 'Asia/Tokyo';

const baseConfig: Omit<GameConfig, 'players'> = {
  ruleSet: 'classic',
  turnSeconds: null,
  maxCucumbers: 999,
  initialCards: 7,
  cpuLevel: 'easy',
};

function readNumberArg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const arg = process.argv.find(value => value.startsWith(prefix));
  if (!arg) return fallback;

  const value = Number(arg.slice(prefix.length));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function readNumberListArg(name: string, fallback: number[]): number[] {
  const prefix = `--${name}=`;
  const arg = process.argv.find(value => value.startsWith(prefix));
  if (!arg) return fallback;

  const values = arg
    .slice(prefix.length)
    .split(/[,\s]+/)
    .map(value => Number(value.trim()))
    .filter(value => Number.isFinite(value));

  return values.length > 0 ? values : fallback;
}

function formatTokyoDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function resolveRepoRoot(): string {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, 'apps', 'hub', 'package.json'))) {
    return cwd;
  }

  const parentFromHub = path.resolve(cwd, '..', '..');
  if (existsSync(path.join(parentFromHub, 'apps', 'hub', 'package.json'))) {
    return parentFromHub;
  }

  throw new Error(`Could not resolve repository root from ${cwd}`);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function createVerdictCounts(reports: MarketBatchReport[]): VerdictCounts {
  return reports.reduce<VerdictCounts>(
    (counts, report) => {
      counts[report.verdict] += 1;
      return counts;
    },
    { strong: 0, watch: 0, weak: 0 },
  );
}

function addVerdictCounts(values: VerdictCounts[]): VerdictCounts {
  return values.reduce<VerdictCounts>(
    (counts, value) => ({
      strong: counts.strong + value.strong,
      watch: counts.watch + value.watch,
      weak: counts.weak + value.weak,
    }),
    { strong: 0, watch: 0, weak: 0 },
  );
}

function resolveMiddleOnlyPenaltyDelta(report: MarketBatchReport): number {
  const { summary } = report;
  if (summary.middleOnlySampleCount > 0) return summary.middleOnlyPenaltyDelta;
  return summary.weakHandAveragePenaltyMarket - summary.weakHandAveragePenaltyClassic;
}

function createAggregatedCells(runs: MarketBatchResult[]): AggregatedCell[] {
  const grouped = new Map<string, MarketBatchReport[]>();

  for (const run of runs) {
    for (const report of run.reports) {
      const key = `${report.players}:${report.extraCards}`;
      grouped.set(key, [...(grouped.get(key) ?? []), report]);
    }
  }

  return [...grouped.values()]
    .map(reports => {
      const first = reports[0];

      return {
        players: first.players,
        extraCards: first.extraCards,
        label: first.label,
        runs: reports.length,
        verdictCounts: createVerdictCounts(reports),
        marketPenaltyDeltaPerPlayer: average(
          reports.map(report => report.summary.marketPenaltyDeltaPerPlayer),
        ),
        middleOnlySampleCount: sum(reports.map(report => report.summary.middleOnlySampleCount)),
        middleOnlyHandRate: average(reports.map(report => report.summary.middleOnlyHandRate)),
        middleOnlyPenaltyDelta: average(reports.map(resolveMiddleOnlyPenaltyDelta)),
        middleOnlyZeroPenaltyDelta: average(
          reports.map(report => report.middleOnlyZeroPenaltyDelta),
        ),
        middleOnlyEdgeRecoveryRate: average(
          reports.map(report => report.summary.middleOnlyEdgeRecoveryRate),
        ),
        exchangeParticipationRate: average(
          reports.map(report => report.summary.exchangeParticipationRate),
        ),
        contestedExchangeRoundRate: average(
          reports.map(report => report.summary.contestedExchangeRoundRate),
        ),
        averageBiddersPerMarketRound: average(
          reports.map(report => report.summary.averageBiddersPerMarketRound),
        ),
        knownCurrentCardShareAfterMarket: average(
          reports.map(report => report.summary.knownCurrentCardShareAfterMarket),
        ),
        highSignalBidRate: average(reports.map(report => report.summary.highSignalBidRate)),
        exchangeLeaderAdvantage: average(reports.map(report => report.exchangeLeaderAdvantage)),
        evaluationScore: average(reports.map(report => report.evaluationScore)),
      };
    })
    .sort((a, b) => a.players - b.players || a.extraCards - b.extraCards);
}

function createAggregatedExtras(cells: AggregatedCell[]): AggregatedExtra[] {
  const extraCards = [...new Set(cells.map(cell => cell.extraCards))].sort((a, b) => a - b);

  return extraCards.map(extra => {
    const matching = cells.filter(cell => cell.extraCards === extra);

    return {
      extraCards: extra,
      label: `人数 + ${extra}`,
      verdictCounts: addVerdictCounts(matching.map(cell => cell.verdictCounts)),
      averageMarketPenaltyDeltaPerPlayer: average(
        matching.map(cell => cell.marketPenaltyDeltaPerPlayer),
      ),
      averageMiddleOnlySampleCount: average(matching.map(cell => cell.middleOnlySampleCount)),
      averageMiddleOnlyHandRate: average(matching.map(cell => cell.middleOnlyHandRate)),
      averageMiddleOnlyPenaltyDelta: average(matching.map(cell => cell.middleOnlyPenaltyDelta)),
      averageMiddleOnlyZeroPenaltyDelta: average(
        matching.map(cell => cell.middleOnlyZeroPenaltyDelta),
      ),
      averageMiddleOnlyEdgeRecoveryRate: average(
        matching.map(cell => cell.middleOnlyEdgeRecoveryRate),
      ),
      averageExchangeParticipationRate: average(matching.map(cell => cell.exchangeParticipationRate)),
      averageContestedExchangeRoundRate: average(
        matching.map(cell => cell.contestedExchangeRoundRate),
      ),
      averageBiddersPerMarketRound: average(matching.map(cell => cell.averageBiddersPerMarketRound)),
      averageKnownCurrentCardShare: average(
        matching.map(cell => cell.knownCurrentCardShareAfterMarket),
      ),
      averageHighSignalBidRate: average(matching.map(cell => cell.highSignalBidRate)),
      averageExchangeLeaderAdvantage: average(matching.map(cell => cell.exchangeLeaderAdvantage)),
      averageEvaluationScore: average(matching.map(cell => cell.evaluationScore)),
    };
  });
}

function selectRecommendation(extras: AggregatedExtra[]): AggregatedExtra {
  const [recommended] = [...extras].sort(
    (a, b) =>
      b.averageEvaluationScore - a.averageEvaluationScore ||
      a.averageMiddleOnlyPenaltyDelta - b.averageMiddleOnlyPenaltyDelta ||
      a.averageKnownCurrentCardShare - b.averageKnownCurrentCardShare,
  );

  return recommended;
}

function createCaveats(cells: AggregatedCell[], extras: AggregatedExtra[]): string[] {
  const caveats: string[] = [
    '現在のCPU方針は市場制度の性質を見るための仮モデルで、人間の読み合いを直接再現しているわけではありません。',
    '1ラウンド単位の比較であり、複数ラウンドをまたいだ心理・得点状況による変化はまだ含めていません。',
  ];

  const sparseCells = cells.filter(cell => cell.middleOnlySampleCount < 20);
  if (sparseCells.length > 0) {
    caveats.push(
      `中間事故手札のサンプルが20件未満の条件があります: ${sparseCells
        .map(cell => cell.label)
        .join('、')}。`,
    );
  }

  const highInfo = extras.filter(extra => extra.averageKnownCurrentCardShare > 0.22);
  if (highInfo.length > 0) {
    caveats.push(
      `既知手札率が高めの市場枚数があります: ${highInfo.map(extra => extra.label).join('、')}。公開情報の見せ方は継続確認が必要です。`,
    );
  }

  const almostAlwaysContested = extras.filter(extra => extra.averageContestedExchangeRoundRate > 0.95);
  if (almostAlwaysContested.length === extras.length) {
    caveats.push(
      '競合交換率が全体的に高く、現CPUでは「交換するか迷う」より「ほぼ全員が参加する」挙動に寄っています。',
    );
  }

  return caveats;
}

function createAggregate(
  runs: MarketBatchResult[],
  options: {
    iterationsPerSeed: number;
    seeds: number[];
    players: number[];
    extraCards: number[];
    reportDate: string;
  },
): AggregatedReport {
  const cells = createAggregatedCells(runs);
  const byExtraCards = createAggregatedExtras(cells);
  const recommendedExtraCards = selectRecommendation(byExtraCards);

  return {
    generatedAt: new Date().toISOString(),
    reportDate: options.reportDate,
    iterationsPerSeed: options.iterationsPerSeed,
    seeds: options.seeds,
    players: options.players,
    extraCards: options.extraCards,
    totalRoundPairsPerCell: options.iterationsPerSeed * options.seeds.length,
    totalRoundPairs:
      options.iterationsPerSeed *
      options.seeds.length *
      options.players.length *
      options.extraCards.length,
    cells,
    byExtraCards,
    recommendedExtraCards,
    caveats: createCaveats(cells, byExtraCards),
  };
}

function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function formatSignedNumber(value: number, digits = 2): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercentagePoint(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}pt`;
}

function formatVerdictCounts(counts: VerdictCounts): string {
  return `strong ${counts.strong} / watch ${counts.watch} / weak ${counts.weak}`;
}

function formatPlayerSet(players: number[]): string {
  const sorted = [...players].sort((a, b) => a - b);
  const isContinuous = sorted.every((value, index) => index === 0 || value === sorted[index - 1] + 1);
  return isContinuous ? `${sorted[0]}〜${sorted[sorted.length - 1]}人` : `${sorted.join('、')}人`;
}

function describeRecommendation(aggregate: AggregatedReport): string[] {
  const recommended = aggregate.recommendedExtraCards;
  const plusTwo = aggregate.byExtraCards.find(extra => extra.extraCards === 2);
  const allWeak =
    recommended.verdictCounts.weak ===
    recommended.verdictCounts.strong + recommended.verdictCounts.watch + recommended.verdictCounts.weak;
  const lines = [
    `現時点のCPU試行では、相対的な第一候補は **${recommended.label}** です。評価点は ${formatNumber(
      recommended.averageEvaluationScore,
    )} でした。`,
  ];

  if (plusTwo && recommended.extraCards === 2) {
    lines.push(
      '当初の本命だった「人数+2」は、事故救済・選択肢の残り方・情報漏れのバランスで最も安定しました。',
    );
  } else if (plusTwo) {
    lines.push(
      `当初の本命だった「人数+2」は評価点 ${formatNumber(
        plusTwo.averageEvaluationScore,
      )} で、今回の試行では ${recommended.label} が上回りました。`,
    );
  }

  if (recommended.averageMiddleOnlyPenaltyDelta <= 0) {
    lines.push(
      `中間事故手札の平均失点差は ${formatSignedNumber(
        recommended.averageMiddleOnlyPenaltyDelta,
      )} で、クラシックより悪化しない方向でした。`,
    );
  } else {
    lines.push(
      `ただし中間事故手札の平均失点差は ${formatSignedNumber(
        recommended.averageMiddleOnlyPenaltyDelta,
      )}、無失点率差は ${formatSignedPercentagePoint(
        recommended.averageMiddleOnlyZeroPenaltyDelta,
      )} で、事故救済としてはまだ弱いです。`,
    );
  }

  if (allWeak) {
    lines.push(
      '全条件が weak 判定のため、このまま本採用ではなく、次は市場CPUの交換判断を修正して再検証する段階です。',
    );
  }

  lines.push(
    `読み合い候補の代理指標である競合交換ラウンド率は ${formatPercent(
      recommended.averageContestedExchangeRoundRate,
    )}、既知手札率は ${formatPercent(recommended.averageKnownCurrentCardShare)} でした。`,
  );

  return lines;
}

function createExtraSummaryTable(extras: AggregatedExtra[]): string {
  const rows = extras.map(extra =>
    [
      extra.label,
      formatNumber(extra.averageEvaluationScore),
      formatSignedNumber(extra.averageMiddleOnlyPenaltyDelta),
      formatSignedPercentagePoint(extra.averageMiddleOnlyZeroPenaltyDelta),
      formatPercent(extra.averageMiddleOnlyEdgeRecoveryRate),
      formatPercent(extra.averageContestedExchangeRoundRate),
      formatPercent(extra.averageKnownCurrentCardShare),
      formatSignedNumber(extra.averageExchangeLeaderAdvantage),
      formatVerdictCounts(extra.verdictCounts),
    ].join(' | '),
  );

  return [
    '| 市場枚数 | 評価点 | 中間事故失点差 | 中間事故無失点率差 | 端札回復率 | 競合交換率 | 既知手札率 | 交換1位優位 | 判定数 |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---|',
    ...rows.map(row => `| ${row} |`),
  ].join('\n');
}

function createCellTable(cells: AggregatedCell[]): string {
  const rows = cells.map(cell =>
    [
      `${cell.players}人`,
      `+${cell.extraCards}`,
      formatNumber(cell.evaluationScore),
      formatSignedNumber(cell.marketPenaltyDeltaPerPlayer),
      formatSignedNumber(cell.middleOnlyPenaltyDelta),
      formatSignedPercentagePoint(cell.middleOnlyZeroPenaltyDelta),
      formatPercent(cell.middleOnlyEdgeRecoveryRate),
      formatPercent(cell.contestedExchangeRoundRate),
      formatPercent(cell.knownCurrentCardShareAfterMarket),
      formatVerdictCounts(cell.verdictCounts),
    ].join(' | '),
  );

  return [
    '| 人数 | 市場 | 評価点 | 全体失点差 | 中間事故失点差 | 中間事故無失点率差 | 端札回復率 | 競合交換率 | 既知手札率 | 判定数 |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---|',
    ...rows.map(row => `| ${row} |`),
  ].join('\n');
}

function createMarkdown(payload: ReportPayload): string {
  const { aggregate, options } = payload;
  const recommendationLines = describeRecommendation(aggregate)
    .map(line => `- ${line}`)
    .join('\n');
  const queryLinks = options.seeds
    .map(
      seed =>
        `- \`/cucumber/market-lab/batch?iterations=${options.iterationsPerSeed}&seed=${seed}\``,
    )
    .join('\n');
  const caveats = aggregate.caveats.map(caveat => `- ${caveat}`).join('\n');

  return `# 仕込み市場 CPUシミュレーションレポート

- 作成日: ${aggregate.reportDate} JST
- 試行条件: ${formatPlayerSet(options.players)}、人数+${options.extraCards.join('/+')}市場
- シード: ${options.seeds.join(', ')}
- 1条件あたり: ${aggregate.totalRoundPairsPerCell} ラウンド比較
- 総比較数: ${aggregate.totalRoundPairs} ラウンド比較
- ルール: クラシックモデルを保護し、仕込み市場モデルだけを比較
- CPU方針: 市場検証用の暫定自動判断

## 結論

${recommendationLines}

この結果だけで最終採用は決めず、次は推奨市場枚数を固定したうえで、CPUの交換判断と人間テストプレイのログを比較するのがよいです。

## 市場枚数別サマリー

${createExtraSummaryTable(aggregate.byExtraCards)}

## 人数別詳細

${createCellTable(aggregate.cells)}

## 注目ポイント

- 中間事故手札は、初期手札が4〜12だけで構成される手札です。
- 中間事故失点差は、マイナスなら市場導入で平均失点が下がったことを示します。
- 中間事故無失点率差は、プラスなら中間事故手札でも無失点で抜ける割合が増えたことを示します。
- 競合交換率は、2人以上が市場交換に参加したラウンド率です。読み合い候補の代理指標として扱います。
- 既知手札率は、市場取得により「今そのプレイヤーが持っている」と全員に知られるカードの割合です。高すぎると読み合いではなく手札推定が簡単になりすぎる懸念があります。
- 交換1位優位は、全体平均失点から交換順1位の平均失点を引いた値です。大きすぎると高い入札カードを出せる人が有利になりすぎている可能性があります。

## 再現用URL

${queryLinks}

## 注意点

${caveats}

## 次に見るべきこと

1. 推奨市場枚数で、CPUの「交換する/しない」と「何を捨てるか」の重みを調整する。
2. 中間事故手札だけを多めに生成するストレステストを追加し、救済力をより濃く見る。
3. 人間プレイログを後で入れられるように、同じ指標で比較できるログ形式を決める。
4. オンライン対戦へ入れる前に、仕込み市場モデルをCPU対戦の任意ルールとして試せるようにする。
`;
}

function writeReport(payload: ReportPayload, repoRoot: string): void {
  const reportDir = path.join(repoRoot, 'docs', 'reports', 'market-simulations');
  mkdirSync(reportDir, { recursive: true });

  const baseName = `${payload.aggregate.reportDate}-market-batch`;
  const markdownPath = path.join(reportDir, `${baseName}.md`);
  const jsonPath = path.join(reportDir, `${baseName}.json`);

  writeFileSync(markdownPath, createMarkdown(payload), 'utf8');
  writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${markdownPath}`);
  console.log(`Wrote ${jsonPath}`);
}

function main(): void {
  const iterationsPerSeed = readNumberArg('iterations', DEFAULT_ITERATIONS);
  const seeds = readNumberListArg('seeds', DEFAULT_SEEDS);
  const players = readNumberListArg('players', DEFAULT_PLAYERS);
  const extraCards = readNumberListArg('extraCards', DEFAULT_EXTRA_CARDS);
  const reportDate = process.argv
    .find(value => value.startsWith('--date='))
    ?.slice('--date='.length) ?? formatTokyoDate(new Date());

  const runs = seeds.map(seed =>
    compareMarketBatch({
      config: baseConfig,
      players,
      extraCards,
      iterations: iterationsPerSeed,
      seed,
    }),
  );
  const aggregate = createAggregate(runs, {
    iterationsPerSeed,
    seeds,
    players,
    extraCards,
    reportDate,
  });
  const payload: ReportPayload = {
    options: {
      config: baseConfig,
      iterationsPerSeed,
      seeds,
      players,
      extraCards,
    },
    aggregate,
    runs,
  };

  writeReport(payload, resolveRepoRoot());
}

main();
