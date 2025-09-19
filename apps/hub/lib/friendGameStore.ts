import { applyMove, endTrick, finalRound, GameConfig, GameState, Move, SeededRng } from '@/lib/game-core';

type GameSnapshot = {
  state: GameState;
  config: GameConfig;
  version: number;
  updatedAt: number;
};

const store: Map<string, GameSnapshot> = new Map();

export function getGame(roomId: string): GameSnapshot | null {
  return store.get(roomId) || null;
}

export function initGame(roomId: string, snapshot: { state: GameState; config: GameConfig }): GameSnapshot {
  const existing = store.get(roomId);
  if (existing) return existing;
  const snap: GameSnapshot = { state: snapshot.state, config: snapshot.config, version: 1, updatedAt: Date.now() };
  store.set(roomId, snap);
  return snap;
}

export function applyServerMove(roomId: string, move: Move): GameSnapshot | null {
  const snap = store.get(roomId);
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
  store.set(roomId, updated);
  return updated;
}


