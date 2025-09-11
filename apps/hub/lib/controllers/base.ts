// プレイヤーコントローラーの基底クラス

import { GameConfig, GameView, PlayerController, SimulationResult, Trick } from '../game-core/types';

export abstract class BaseController implements PlayerController {
  protected playerIndex: number;
  protected config: GameConfig | null = null;

  constructor(playerIndex: number) {
    this.playerIndex = playerIndex;
  }

  abstract onYourTurn(view: GameView): Promise<number | null>;

  onGameStart?(config: GameConfig): void {
    this.config = config;
  }

  onGameEnd?(result: SimulationResult): void {
    // デフォルト実装は何もしない
  }

  onTrickEnd?(trick: Trick): void {
    // デフォルト実装は何もしない
  }

  getPlayerIndex(): number {
    return this.playerIndex;
  }

  getConfig(): GameConfig | null {
    return this.config;
  }
}
