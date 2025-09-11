// リモートプレイヤーのコントローラー（WebSocket/Realtime用）

import { GameView } from '../game-core/types';
import { BaseController } from './base';

export interface RemoteConnection {
  send(message: any): void;
  onMessage(callback: (message: any) => void): void;
  disconnect(): void;
  isConnected(): boolean;
}

export class RemoteController extends BaseController {
  private connection: RemoteConnection;
  private pendingMove: number | null = null;
  private moveResolver: ((move: number | null) => void) | null = null;

  constructor(playerIndex: number, connection: RemoteConnection) {
    super(playerIndex);
    this.connection = connection;
    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    this.connection.onMessage((message) => {
      if (message.type === 'move' && message.player === this.playerIndex) {
        if (this.moveResolver) {
          this.moveResolver(message.card);
          this.moveResolver = null;
        }
      } else if (message.type === 'pass' && message.player === this.playerIndex) {
        if (this.moveResolver) {
          this.moveResolver(null);
          this.moveResolver = null;
        }
      }
    });
  }

  async onYourTurn(view: GameView): Promise<number | null> {
    return new Promise((resolve) => {
      this.moveResolver = resolve;
      
      // リモートプレイヤーにゲーム状態を送信
      this.connection.send({
        type: 'your_turn',
        player: this.playerIndex,
        gameView: {
          legalMoves: view.legalMoves,
          fieldCard: view.state.fieldCard,
          currentTrick: view.state.currentTrick,
          currentRound: view.state.currentRound,
          playerHand: view.state.players[this.playerIndex].hand,
          playerCucumbers: view.state.players[this.playerIndex].cucumbers
        }
      });
    });
  }

  // タイムアウト処理
  onTimeout(): void {
    if (this.moveResolver) {
      this.moveResolver(null);
      this.moveResolver = null;
    }
  }

  // 接続状態チェック
  isConnected(): boolean {
    return this.connection.isConnected();
  }

  // 接続を切断
  disconnect(): void {
    this.connection.disconnect();
  }
}

// ダミー実装（開発用）
export class DummyRemoteConnection implements RemoteConnection {
  private messageHandlers: ((message: any) => void)[] = [];
  private connected = true;

  send(message: any): void {
    console.log('DummyRemoteConnection.send:', message);
    // ダミー応答をシミュレート
    setTimeout(() => {
      if (message.type === 'your_turn') {
        const dummyMove = {
          type: 'move',
          player: message.player,
          card: Math.floor(Math.random() * 15) + 1
        };
        this.messageHandlers.forEach(handler => handler(dummyMove));
      }
    }, 1000 + Math.random() * 2000);
  }

  onMessage(callback: (message: any) => void): void {
    this.messageHandlers.push(callback);
  }

  disconnect(): void {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
