import { applyMove, endTrick, finalRound, GameConfig, GameState, Move, SeededRng } from '@/lib/game-core';
import { kv } from './kv';

type GameSnapshot = {
  state: GameState;
  config: GameConfig;
  version: number;
  updatedAt: number;
};

const store: Map<string, GameSnapshot> = new Map();

async function readSnap(roomId: string): Promise<GameSnapshot | null> {
  if (kv) {
    const v = await kv.get(`game:${roomId}`);
    return v || null;
  }
  return store.get(roomId) || null;
}

async function writeSnap(roomId: string, snap: GameSnapshot): Promise<void> {
  if (kv) {
    await kv.set(`game:${roomId}`, snap);
    return;
  }
  store.set(roomId, snap);
}

export async function getGame(roomId: string): Promise<GameSnapshot | null> { return await readSnap(roomId); }

export async function initGame(roomId: string, snapshot: { state: GameState; config: GameConfig }): Promise<GameSnapshot> {
  const existing = await readSnap(roomId);
  if (existing) return existing;
  const snap: GameSnapshot = { state: snapshot.state, config: snapshot.config, version: 1, updatedAt: Date.now() };
  await writeSnap(roomId, snap);
  return snap;
}

export async function applyServerMove(roomId: string, move: Move): Promise<GameSnapshot | null> {
  const snap = await readSnap(roomId);
  if (!snap) return null;

  const rng = new SeededRng(snap.config.seed);
  let result = applyMove(snap.state, move, snap.config, rng);
  if (!result.success) return snap; // ignore illegal

  let newState = result.newState;
  if (newState.phase === 'ResolvingTrick') {
    const t = endTrick(newState, snap.config, rng);
    if (t.success) newState = t.newState;
    if (newState.phase === 'RoundEnd') {
      const f = finalRound(newState, snap.config, rng);
      if (f.success) newState = f.newState;
    }
  }

  const updated: GameSnapshot = {
    state: newState,
    config: snap.config,
    version: snap.version + 1,
    updatedAt: Date.now()
  };
  await writeSnap(roomId, updated);
  return updated;
}


