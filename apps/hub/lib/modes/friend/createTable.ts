// フレンド対戦モードのテーブル作成

import { HumanController } from '../controllers/human';
import { RemoteConnection, RemoteController } from '../controllers/remote';
import { GameConfig, PlayerController } from '../game-core/types';

export interface FriendTableConfig {
  players: number;
  turnSeconds: number | null;
  maxCucumbers: number;
  initialCards: number;
  roomCode: string;
  connections: RemoteConnection[];
}

export interface FriendTable {
  controllers: PlayerController[];
  config: GameConfig;
  humanControllers: HumanController[];
  remoteControllers: RemoteController[];
}

export function createFriendTable(tableConfig: FriendTableConfig): FriendTable {
  const config: GameConfig = {
    players: tableConfig.players,
    turnSeconds: tableConfig.turnSeconds,
    maxCucumbers: tableConfig.maxCucumbers,
    initialCards: tableConfig.initialCards,
    cpuLevel: 'normal' // フレンド対戦では使用しない
  };

  const controllers: PlayerController[] = [];
  const humanControllers: HumanController[] = [];
  const remoteControllers: RemoteController[] = [];

  // ローカルプレイヤー（複数人対応）
  for (let i = 0; i < Math.min(2, tableConfig.players); i++) {
    const humanController = new HumanController(i);
    controllers[i] = humanController;
    humanControllers.push(humanController);
  }

  // リモートプレイヤー
  for (let i = humanControllers.length; i < tableConfig.players; i++) {
    const connection = tableConfig.connections[i - humanControllers.length];
    const remoteController = new RemoteController(i, connection);
    controllers[i] = remoteController;
    remoteControllers.push(remoteController);
  }

  return {
    controllers,
    config,
    humanControllers,
    remoteControllers
  };
}
