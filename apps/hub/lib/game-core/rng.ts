// シード対応の乱数生成器

export interface RngState {
  seed: number;
  state: number;
}

export class SeededRng {
  private state: number;

  constructor(seed: number = Date.now()) {
    this.state = seed;
  }

  // 線形合同法による乱数生成
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }

  // 0以上max未満の整数を返す
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  // min以上max未満の整数を返す
  nextIntRange(min: number, max: number): number {
    return min + this.nextInt(max - min);
  }

  // 配列をシャッフル
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // 配列からランダムに選択
  choice<T>(array: T[]): T {
    return array[this.nextInt(array.length)];
  }

  // 重み付き選択
  weightedChoice<T>(items: { item: T; weight: number }[]): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = this.next() * totalWeight;
    
    for (const { item, weight } of items) {
      random -= weight;
      if (random <= 0) {
        return item;
      }
    }
    
    return items[items.length - 1].item;
  }

  // 現在の状態を取得
  getState(): RngState {
    return { seed: this.state, state: this.state };
  }

  // 状態を復元
  setState(state: RngState): void {
    this.state = state.state;
  }
}

// グローバルRNGインスタンス
let globalRng: SeededRng | null = null;

export function getGlobalRng(): SeededRng {
  if (!globalRng) {
    globalRng = new SeededRng();
  }
  return globalRng;
}

export function setGlobalRng(rng: SeededRng): void {
  globalRng = rng;
}

export function createRng(seed?: number): SeededRng {
  return new SeededRng(seed);
}
