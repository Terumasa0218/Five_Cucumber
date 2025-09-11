// CPU対戦モードのテーブル作成

import { CpuController } from '../../controllers/cpu';
import { HumanController } from '../../controllers/human';
import { GameConfig, PlayerController } from '../../game-core/types';

export interface CpuTableConfig {
  players: number;
  turnSeconds: number | null;
  maxCucumbers: number;
  initialCards: number;
  cpuLevel: 'easy' | 'normal' | 'hard';
  seed?: number;
}

export interface CpuTable {
  controllers: PlayerController[];
  config: GameConfig;
  humanController: HumanController;
}

export function createCpuTable(tableConfig: CpuTableConfig): CpuTable {
  const config: GameConfig = {
    players: tableConfig.players,
    turnSeconds: tableConfig.turnSeconds,
    maxCucumbers: tableConfig.maxCucumbers,
    initialCards: tableConfig.initialCards,
    cpuLevel: tableConfig.cpuLevel,
    seed: tableConfig.seed
  };

  const controllers: PlayerController[] = [];
  const humanController = new HumanController(0);
  controllers[0] = humanController;

  // CPUコントローラーを作成
  for (let i = 1; i < tableConfig.players; i++) {
    const cpuController = new CpuController(i, tableConfig.cpuLevel, tableConfig.seed);
    controllers[i] = cpuController;
  }

  return {
    controllers,
    config,
    humanController
  };
}

export function createCpuTableFromUrlParams(params: URLSearchParams): CpuTable {
  const tableConfig: CpuTableConfig = {
    players: parseInt(params.get('players') || '4'),
    turnSeconds: parseInt(params.get('turnSeconds') || '15') || null,
    maxCucumbers: parseInt(params.get('maxCucumbers') || '6'),
    initialCards: 7,
    cpuLevel: (params.get('cpuLevel') as 'easy' | 'normal' | 'hard') || 'normal',
    seed: parseInt(params.get('seed') || '0') || undefined
  };

  return createCpuTable(tableConfig);
}
