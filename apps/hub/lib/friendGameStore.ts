import { applyMove, endTrick, finalRound, GameConfig, GameState, Move, SeededRng } from '@/lib/game-core';
import {
  getRoomGameSnapshot,
  saveRoomGameSnapshot
} from '@/lib/roomsStore';
import {
  getRoomGameSnapshotRedis,
  saveRoomGameSnapshotRedis
} from '@/lib/roomsRedis';
import type { RoomGameSnapshot } from '@/types/room';
import { HAS_SHARED_STORE } from '@/lib/serverSync';
import { isRedisAvailable } from '@/lib/redis';

const HAS_FIRESTORE = Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

export type GameSnapshot = RoomGameSnapshot;

const memoryStore: Map<string, GameSnapshot> = new Map();

async function loadSnapshot(roomId: string): Promise<GameSnapshot | null> {
  // 共有ストアが無い環境ではサーバ同期を無効化（メモリ使用禁止）
  if (!HAS_SHARED_STORE) {
    return null;
  }
  const local = memoryStore.get(roomId);
  if (local) return local;

  if (HAS_FIRESTORE) {
    try {
      const snap = await getRoomGameSnapshot(roomId);
      if (snap) {
        memoryStore.set(roomId, snap);
        return snap;
      }
    } catch (error) {
      console.warn('[FriendGameStore] Failed to load snapshot from Firestore:', error);
    }
  }

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

  if (HAS_FIRESTORE) {
    try {
      await saveRoomGameSnapshot(roomId, snapshot);
      persisted = true;
    } catch (error) {
      console.warn('[FriendGameStore] Failed to persist snapshot to Firestore:', error);
    }
  }

  if (isRedisAvailable()) {
    try {
      await saveRoomGameSnapshotRedis(roomId, snapshot);
      persisted = true;
    } catch (error) {
      console.warn('[FriendGameStore] Failed to persist snapshot to Redis:', error);
    }
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
  snapshot: { state: GameState; config: GameConfig }
): Promise<GameSnapshot> {
  const existing = await loadSnapshot(roomId);
  if (existing) return existing;

  const snap: GameSnapshot = {
    state: snapshot.state,
    config: snapshot.config,
    version: 1,
    updatedAt: Date.now()
  };
  await persistSnapshot(roomId, snap);
  return snap;
}

export async function applyServerMove(roomId: string, move: Move): Promise<GameSnapshot | null> {
  const snap = await loadSnapshot(roomId);
  if (!snap) return null;

  const rng = new SeededRng(snap.config.seed ?? Date.now());
  const result = applyMove(snap.state, move, snap.config, rng);
  if (!result.success) return snap; // ignore illegal moves but keep existing state

  let newState = result.newState;
  if (newState.phase === 'ResolvingTrick') {
    const trickResult = endTrick(newState, snap.config, rng);
    if (trickResult.success) newState = trickResult.newState;
    if (newState.phase === 'RoundEnd') {
      const finalResult = finalRound(newState, snap.config, rng);
      if (finalResult.success) newState = finalResult.newState;
    }
  }

  const updated: GameSnapshot = {
    state: newState,
    config: snap.config,
    version: snap.version + 1,
    updatedAt: Date.now()
  };
  await persistSnapshot(roomId, updated);
  return updated;
}
