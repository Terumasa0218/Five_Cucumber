'use client';

import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebaseClient';

export type ViewDoc = { v: number; h: string; state: any };

export function subscribeMyView(roomId: string, gameId: string, uid: string, onUpdate: (v: ViewDoc) => void) {
  const ref = doc(db, 'rooms', roomId, 'games', gameId, 'views', uid);
  const unsub = onSnapshot(ref, (snap) => {
    if (snap.exists()) onUpdate(snap.data() as ViewDoc);
  });
  return unsub;
}

export async function callStartGame(roomId: string) {
  const fn = httpsCallable(functions as any, 'startGame');
  const res = await fn({ roomId });
  return (res.data as any).gameId as string;
}

export async function callProposeMove(input: { roomId: string; gameId: string; opId: string; baseV: number; action: any }) {
  const fn = httpsCallable(functions as any, 'proposeMove');
  const res = await fn(input);
  return res.data as any;
}


