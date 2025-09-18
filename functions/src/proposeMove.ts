import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { ProposeMoveInput } from './types';
import { apply, validate, projectViewFor } from './engine';
import { hashState } from './utils/hashState';

const db = admin.firestore();

export const proposeMove = onCall<ProposeMoveInput>(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new Error('UNAUTHENTICATED');
  const { roomId, gameId, opId, baseV, action } = req.data;

  const gameRef = db.collection('rooms').doc(roomId).collection('games').doc(gameId);
  const opRef = gameRef.collection('appliedOps').doc(opId);

  return await db.runTransaction(async (tx) => {
    const [gameSnap, opSnap] = await Promise.all([tx.get(gameRef), tx.get(opRef)]);
    if (!gameSnap.exists) throw new Error('GAME_NOT_FOUND');
    if (opSnap.exists) {
      const g = gameSnap.data() as any;
      return { v: g.v, dedup: true };
    }
    const g = gameSnap.data() as any;
    if (g.status !== 'playing') throw new Error('NOT_PLAYING');
    if (g.v !== baseV) throw new Error('STALE_VERSION');

    const seats: string[] = g.seats;
    const actorSeat = seats.indexOf(uid);
    if (actorSeat === -1) throw new Error('NOT_IN_GAME');

    const fullState = { ...(g.state || {}), seats, turn: g.turn };
    if (!validate(fullState, action, actorSeat)) throw new Error('INVALID_MOVE');

    const next = apply(fullState, action);
    const newV = g.v + 1;

    tx.update(gameRef, {
      v: newV,
      state: next,
      turn: next.turn,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    tx.set(gameRef.collection('events').doc(String(newV)), {
      seq: newV, playerId: uid, action, createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    for (const playerId of seats) {
      const view = projectViewFor(next, playerId);
      const h = hashState(view);
      tx.set(gameRef.collection('views').doc(playerId), { v: newV, h, state: view }, { merge: true });
    }

    tx.set(opRef, { playerId: uid, baseV, appliedAt: admin.firestore.FieldValue.serverTimestamp() });

    return { v: newV };
  });
});


