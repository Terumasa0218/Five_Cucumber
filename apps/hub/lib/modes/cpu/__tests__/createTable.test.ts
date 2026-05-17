import { describe, expect, it } from 'vitest';

import { createCpuTable, createCpuTableFromUrlParams } from '../createTable';

describe('createCpuTable', () => {
  it.each([2, 3, 4, 5, 6])('%i人分のコントローラーを作成する', players => {
    const table = createCpuTable({
      players,
      turnSeconds: 15,
      maxCucumbers: 5,
      initialCards: 7,
      cpuLevel: 'normal',
      seed: 123,
    });

    expect(table.config.players).toBe(players);
    expect(table.controllers).toHaveLength(players);
    expect(table.controllers[0]).toBe(table.humanController);
  });

  it('URLパラメータの範囲外プレイヤー数を2〜6人に丸める', () => {
    const tooFew = createCpuTableFromUrlParams(new URLSearchParams('players=1'));
    const tooMany = createCpuTableFromUrlParams(new URLSearchParams('players=9'));

    expect(tooFew.config.players).toBe(2);
    expect(tooFew.controllers).toHaveLength(2);
    expect(tooMany.config.players).toBe(6);
    expect(tooMany.controllers).toHaveLength(6);
  });

  it('不正なCPU難易度はnormalに戻す', () => {
    const table = createCpuTableFromUrlParams(new URLSearchParams('cpuLevel=expert'));

    expect(table.config.cpuLevel).toBe('normal');
  });
});
