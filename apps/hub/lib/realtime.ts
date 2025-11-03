import type { RealtimeAdapter } from './realtime-adapter';
import { ablyAdapter } from './realtime-ably';

export const realtime: RealtimeAdapter = (() => {
  switch (process.env.REALTIME_PROVIDER) {
    case 'ably':
    default:
      return ablyAdapter;
  }
})();

import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { GameConfig, GameState, Move } from './game-core';

export interface RealtimeCallbacks {
  onState?: (state: GameState) => void;
  onConfig?: (config: GameConfig) => void;
  onMove?: (move: Move) => void;
}

export function subscribeRoomGame(roomId: string, callbacks: RealtimeCallbacks) {
  if (!db) return () => {};
  const gameRef = doc(db, 'room-games', roomId);
  const unsub = onSnapshot(gameRef, (snap) => {
    const data = snap.data();
    if (!data) return;
    if (data.state && callbacks.onState) callbacks.onState(data.state as GameState);
    if (data.config && callbacks.onConfig) callbacks.onConfig(data.config as GameConfig);
    if (data.lastMove && callbacks.onMove) callbacks.onMove(data.lastMove as Move);
  });
  return unsub;
}

export async function initRoomGame(roomId: string, config: GameConfig, state: GameState) {
  if (!db) return;
  const gameRef = doc(db, 'room-games', roomId);
  await setDoc(gameRef, { config, state, updatedAt: Date.now() }, { merge: true });
}

export async function pushMove(roomId: string, move: Move, newState: GameState) {
  if (!db) return;
  const gameRef = doc(db, 'room-games', roomId);
  const payload: Record<string, unknown> = {
    lastMove: move,
    state: newState,
    updatedAt: Date.now(),
  };
  await updateDoc(gameRef, payload);
}


