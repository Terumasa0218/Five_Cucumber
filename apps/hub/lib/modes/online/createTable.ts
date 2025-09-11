// オンライン対戦モードのテーブル作成

import { HumanController } from '../controllers/human';
import { RemoteConnection, RemoteController } from '../controllers/remote';
import { GameConfig, PlayerController } from '../game-core/types';

export interface OnlineTableConfig {
  players: number;
  turnSeconds: number | null;
  maxCucumbers: number;
  initialCards: number;
  roomId: string;
  connection: RemoteConnection;
  playerIndex: number;
}

export interface OnlineTable {
  controllers: PlayerController[];
  config: GameConfig;
  humanController: HumanController | null;
  remoteControllers: RemoteController[];
}

export function createOnlineTable(tableConfig: OnlineTableConfig): OnlineTable {
  const config: GameConfig = {
    players: tableConfig.players,
    turnSeconds: tableConfig.turnSeconds,
    maxCucumbers: tableConfig.maxCucumbers,
    initialCards: tableConfig.initialCards,
    cpuLevel: 'normal' // オンライン対戦では使用しない
  };

  const controllers: PlayerController[] = [];
  const remoteControllers: RemoteController[] = [];
  let humanController: HumanController | null = null;

  // 全プレイヤーをリモートとして初期化
  for (let i = 0; i < tableConfig.players; i++) {
    if (i === tableConfig.playerIndex) {
      // 自分のみ人間コントローラー
      humanController = new HumanController(i);
      controllers[i] = humanController;
    } else {
      // 他のプレイヤーはリモートコントローラー
      const remoteController = new RemoteController(i, tableConfig.connection);
      controllers[i] = remoteController;
      remoteControllers.push(remoteController);
    }
  }

  return {
    controllers,
    config,
    humanController,
    remoteControllers
  };
}
