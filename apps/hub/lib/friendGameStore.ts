import {
  applyMove,
  determineTrickWinner,
  GameConfig,
  GameState,
  Move,
  RngState,
  SeededRng,
} from '@/lib/game-core';
import {
  getRoomGameSnapshotRedis,
  saveRoomGameSnapshotRedis
} from '@/lib/roomsRedis';
import type { RoomGameSnapshot, RoomResolvedTrickSnapshot } from '@/types/room';
import { HAS_SHARED_STORE } from '@/lib/serverSync';
import { isRedisAvailable } from '@/lib/redis';

export type GameSnapshot = RoomGameSnapshot;

const memoryStore: Map<string, GameSnapshot> = new Map();

export function createResolvedTrickSnapshot(
  state: GameState,
  config: GameConfig,
  move: Move,
  completedAt = Date.now()
): RoomResolvedTrickSnapshot | null {
  const actionCountAfterMove = (state.actionCount ?? 0) + 1;
  if (actionCountAfterMove < config.players) return null;

  const cards = move.isDiscard ? [...state.trickCards] : [...state.trickCards, move];
  return {
    round: state.currentRound,
    trick: state.currentTrick,
    cards,
    winner: determineTrickWinner(cards),
    completedAt,
  };
}

export function applyFinalShowdownMove(
  state: GameState,
  config: GameConfig,
  rng: SeededRng,
  triggerMove: Move,
  completedAt = Date.now()
): { state: GameState; moves: Move[]; resolvedTrick: RoomResolvedTrickSnapshot } | null {
  if (!state.isFinalTrick || state.phase !== 'AwaitMove') return null;
  if (triggerMove.player !== state.currentPlayer || triggerMove.isDiscard) return null;

  let nextState = state;
  const moves: Move[] = [];
  const baseTimestamp = triggerMove.timestamp || completedAt;

  for (let offset = 0; offset < config.players; offset++) {
    const player = (state.currentPlayer + offset) % config.players;
    const hand = nextState.players[player]?.hand ?? [];
    const card = player === triggerMove.player ? triggerMove.card : hand[0];
    if (typeof card !== 'number') return null;

    const move: Move = {
      player,
      card,
      timestamp: player === triggerMove.player ? baseTimestamp : baseTimestamp + offset,
      isDiscard: false,
    };
    const result = applyMove(nextState, move, config, rng);
    if (!result.success) return null;

    moves.push(move);
    nextState = result.newState;
  }

  return {
    state: nextState,
    moves,
    resolvedTrick: {
      round: state.currentRound,
      trick: state.currentTrick,
      cards: moves,
      winner: determineTrickWinner(moves),
      completedAt,
    },
  };
}

async function loadSnapshot(roomId: string): Promise<GameSnapshot | null> {
  // 共有ストアが無い環境ではサーバ同期を無効化（メモリ使用禁止）
  if (!HAS_SHARED_STORE) {
    return null;
  }
  const local = memoryStore.get(roomId);
  if (local) return local;

  if (isRedisAvailable()) {
    try {
      const snap = await getRoomGameSnapshotRedis(roomId);
      if (snap) {
        memoryStore.set(roomId, snap);
        return snap;
      }
    } catch (error) {
      console.warn('[FriendGameStore] Failed to load snapshot from Redis:', error);
    }
  }

  // 共有ストアが利用できない場合のメモリフォールバックは禁止
  return null;
}

async function persistSnapshot(roomId: string, snapshot: GameSnapshot): Promise<void> {
  if (!HAS_SHARED_STORE) {
    // サーバ同期が無い場合は保存自体を行わない（クライアント同期へ）
    return;
  }
  memoryStore.set(roomId, snapshot);

  let persisted = false;

  // フレンド対戦の権威状態はルーム情報と同じ Redis/KV に保存する。
  // Firebase は匿名認証/Admin検証に使い、Firestore は要求しない。
  try {
    await saveRoomGameSnapshotRedis(roomId, snapshot);
    persisted = true;
  } catch (error) {
    console.warn('[FriendGameStore] Failed to persist snapshot to Redis/KV:', error);
  }

  // 共有ストアへの永続に失敗した場合はエラーにする（早期検知）
  if (!persisted) {
    throw new Error('persist-failed');
  }
}

export async function getGame(roomId: string): Promise<GameSnapshot | null> {
  return loadSnapshot(roomId);
}

export async function initGame(
  roomId: string,
  snapshot: { state: GameState; config: GameConfig; rngState?: RngState }
): Promise<GameSnapshot> {
  const existing = await loadSnapshot(roomId);
  if (existing) return existing;

  const snap: GameSnapshot = {
    state: snapshot.state,
    config: snapshot.config,
    version: 1,
    updatedAt: Date.now(),
    rngState: snapshot.rngState,
    resolvedTrick: null,
  };
  await persistSnapshot(roomId, snap);
  return snap;
}

export async function applyServerMove(roomId: string, move: Move): Promise<GameSnapshot | null> {
  const snap = await loadSnapshot(roomId);
  if (!snap) return null;

  // ラウンド継続中は RNG 状態をスナップショットに保持して再利用する
  // なければ初期化（初回のみ）
  const rngState = snap.rngState;
  const rng = rngState ? SeededRng.fromState(rngState) : new SeededRng(snap.config.seed ?? Date.now());
  const updatedAt = Date.now();

  const finalShowdown = applyFinalShowdownMove(snap.state, snap.config, rng, move, updatedAt);
  const result = finalShowdown ? null : applyMove(snap.state, move, snap.config, rng);
  if (!finalShowdown && result && !result.success) return snap; // ignore illegal moves but keep existing state
  const resolvedTrick =
    finalShowdown?.resolvedTrick ?? createResolvedTrickSnapshot(snap.state, snap.config, move, updatedAt);

  const newState = finalShowdown?.state ?? result!.newState;

  const updated: GameSnapshot = {
    state: newState,
    config: snap.config,
    version: snap.version + 1,
    updatedAt,
    rngState: rng.getState(),
    lastMove: finalShowdown ? undefined : move,
    resolvedTrick,
  };
  await persistSnapshot(roomId, updated);
  return updated;
}
