// 人間プレイヤーのコントローラー

import { GameView } from '../game-core/types';
import { BaseController } from './base';

export class HumanController extends BaseController {
  private pendingMove: number | null = null;
  private moveResolver: ((move: number | null) => void) | null = null;

  constructor(playerIndex: number) {
    super(playerIndex);
  }

  async onYourTurn(_view: GameView): Promise<number | null> {
    return new Promise((resolve) => {
      this.moveResolver = resolve;
      // UIからの入力待ち
    });
  }

  // UIから呼び出される
  playCard(card: number): void {
    if (this.moveResolver) {
      this.moveResolver(card);
      this.moveResolver = null;
    }
  }

  // UIから呼び出される（パスなど）
  pass(): void {
    if (this.moveResolver) {
      this.moveResolver(null);
      this.moveResolver = null;
    }
  }

  // 現在のターンかチェック
  isMyTurn(): boolean {
    return this.moveResolver !== null;
  }

  // 待機中のリゾルバーをクリア
  clearPendingMove(): void {
    if (this.moveResolver) {
      this.moveResolver(null);
      this.moveResolver = null;
    }
  }
}
