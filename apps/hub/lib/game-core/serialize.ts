// ゲーム状態のシリアライゼーション

import { RngState } from './rng';
import { GameConfig, GameSnapshot, GameState } from './types';

export const GAME_VERSION = '1.0.0';

export function createSnapshot(state: GameState, config: GameConfig): GameSnapshot {
  return {
    state: JSON.parse(JSON.stringify(state)), // ディープコピー
    config: JSON.parse(JSON.stringify(config)),
    timestamp: Date.now(),
    version: GAME_VERSION
  };
}

export function serializeSnapshot(snapshot: GameSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function deserializeSnapshot(json: string): GameSnapshot {
  const snapshot = JSON.parse(json) as GameSnapshot;
  
  // バージョンチェック
  if (snapshot.version !== GAME_VERSION) {
    console.warn(`Snapshot version mismatch: expected ${GAME_VERSION}, got ${snapshot.version}`);
  }
  
  return snapshot;
}

export function serializeState(state: GameState): string {
  return JSON.stringify(state, null, 2);
}

export function deserializeState(json: string): GameState {
  return JSON.parse(json) as GameState;
}

export function serializeConfig(config: GameConfig): string {
  return JSON.stringify(config, null, 2);
}

export function deserializeConfig(json: string): GameConfig {
  return JSON.parse(json) as GameConfig;
}

export function serializeRngState(rngState: RngState): string {
  return JSON.stringify(rngState);
}

export function deserializeRngState(json: string): RngState {
  return JSON.parse(json) as RngState;
}

// ゲーム状態の検証
export function validateGameState(state: GameState): boolean {
  try {
    // 基本的な構造チェック
    if (!state.players || !Array.isArray(state.players)) return false;
    if (typeof state.currentPlayer !== 'number') return false;
    if (typeof state.currentRound !== 'number') return false;
    if (typeof state.currentTrick !== 'number') return false;
    if (!Array.isArray(state.trickCards)) return false;
    if (!Array.isArray(state.sharedGraveyard)) return false;
    
    // プレイヤー状態のチェック
    for (const player of state.players) {
      if (!Array.isArray(player.hand)) return false;
      if (typeof player.cucumbers !== 'number') return false;
      if (!Array.isArray(player.graveyard)) return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

export function validateGameConfig(config: GameConfig): boolean {
  try {
    if (typeof config.players !== 'number' || config.players < 2 || config.players > 6) return false;
    if (config.turnSeconds !== null && (typeof config.turnSeconds !== 'number' || config.turnSeconds < 0)) return false;
    if (typeof config.maxCucumbers !== 'number' || config.maxCucumbers < 1) return false;
    if (typeof config.initialCards !== 'number' || config.initialCards < 1) return false;
    if (!['easy', 'normal', 'hard'].includes(config.cpuLevel)) return false;
    
    return true;
  } catch {
    return false;
  }
}

// ゲーム状態の差分を計算（デバッグ用）
export function getStateDiff(oldState: GameState, newState: GameState): Record<string, unknown> {
  const diff: Record<string, unknown> = {};
  
  // プレイヤー状態の差分
  for (let i = 0; i < newState.players.length; i++) {
    const oldPlayer = oldState.players[i];
    const newPlayer = newState.players[i];
    
    if (JSON.stringify(oldPlayer.hand) !== JSON.stringify(newPlayer.hand)) {
      diff[`player${i}.hand`] = { old: oldPlayer.hand, new: newPlayer.hand };
    }
    
    if (oldPlayer.cucumbers !== newPlayer.cucumbers) {
      diff[`player${i}.cucumbers`] = { old: oldPlayer.cucumbers, new: newPlayer.cucumbers };
    }
    
    if (JSON.stringify(oldPlayer.graveyard) !== JSON.stringify(newPlayer.graveyard)) {
      diff[`player${i}.graveyard`] = { old: oldPlayer.graveyard, new: newPlayer.graveyard };
    }
  }
  
  // その他の状態の差分
  if (oldState.currentPlayer !== newState.currentPlayer) {
    diff.currentPlayer = { old: oldState.currentPlayer, new: newState.currentPlayer };
  }
  
  if (oldState.fieldCard !== newState.fieldCard) {
    diff.fieldCard = { old: oldState.fieldCard, new: newState.fieldCard };
  }
  
  if (JSON.stringify(oldState.trickCards) !== JSON.stringify(newState.trickCards)) {
    diff.trickCards = { old: oldState.trickCards, new: newState.trickCards };
  }
  
  return diff;
}
