import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { initGame, projectViewFor } from './engine';
import { hashState } from './utils/hashState';

const db = admin.firestore();

export const startGame = onCall<{ roomId: string }>(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new Error('UNAUTHENTICATED');
  const { roomId } = req.data;

  const roomRef = db.collection('rooms').doc(roomId);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) throw new Error('ROOM_NOT_FOUND');
  const room = roomSnap.data() as any;

  const seats: string[] = (room.seats?.map((s: any) => s?.uid || s?.id || s?.nickname)?.filter(Boolean)) || room.members || [];
  if (!Array.isArray(seats) || seats.length < 2) throw new Error('NOT_ENOUGH_PLAYERS');

  const seed = `${Date.now()}:${roomId}`; // サーバーでのみ生成
  const gameRef = roomRef.collection('games').doc();
  const gameId = gameRef.id;

  const initial = initGame(seats, seed);
  const v = 0;

  await db.runTransaction(async (tx) => {
    tx.set(gameRef, {
      status: 'playing', v, seed, seats, turn: initial.turn, state: initial,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    for (const playerId of seats) {
      const view = projectViewFor(initial, playerId);
      const h = hashState(view);
      tx.set(gameRef.collection('views').doc(playerId), { v, h, state: view });
    }
    tx.set(gameRef.collection('events').doc('0'), {
      seq: 0, type: 'game_started', createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  await roomRef.set({ currentGameId: gameId }, { merge: true });

  return { gameId };
});


