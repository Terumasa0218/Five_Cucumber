'use client';

import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { GameSnapshot, Move } from './game-core';
import { db, functions } from './firebaseClient';

export type ViewDoc = { v: number; h: string; state: GameSnapshot['state'] };

export function subscribeMyView(roomId: string, gameId: string, uid: string, onUpdate: (view: ViewDoc) => void) {
  const ref = doc(db, 'rooms', roomId, 'games', gameId, 'views', uid);
  const unsub = onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as ViewDoc);
    }
  });
  return unsub;
}

type StartGameResponse = { gameId: string };

export async function callStartGame(roomId: string) {
  const startGameFn = httpsCallable<{ roomId: string }, StartGameResponse>(functions, 'startGame');
  const res = await startGameFn({ roomId });
  return res.data.gameId;
}

export interface ProposeMoveInput {
  roomId: string;
  gameId: string;
  opId: string;
  baseV: number;
  action: Move;
}

export type ProposeMoveResponse = { ok: boolean; error?: string };

export async function callProposeMove(input: ProposeMoveInput) {
  const proposeMoveFn = httpsCallable<ProposeMoveInput, ProposeMoveResponse>(functions, 'proposeMove');
  const res = await proposeMoveFn(input);
  return res.data;
}


