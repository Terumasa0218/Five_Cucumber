import { db } from '@/lib/firebase';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { Room, RoomGameSnapshot } from '@/types/room';
import type { Firestore as AdminFirestore } from 'firebase-admin/firestore';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { Firestore as ClientFirestore } from 'firebase/firestore';

type FirestoreSource =
  | { kind: 'admin'; db: AdminFirestore }
  | { kind: 'client'; db: ClientFirestore };

function getStore(): FirestoreSource | null {
  if (typeof window !== 'undefined') {
    return null;
  }

  const adminDb = getAdminDb();
  if (adminDb) {
    return { kind: 'admin', db: adminDb };
  }

  if (db) {
    return { kind: 'client', db };
  }

  return null;
}

const collectionName = 'rooms';

export async function getRoomById(roomId: string): Promise<Room | null> {
  const store = getStore();
  if (!store) return null;

  try {
    if (store.kind === 'admin') {
      const snap = await store.db.collection(collectionName).doc(roomId).get();
      return snap.exists ? (snap.data() as Room) : null;
    }

    const ref = doc(store.db, collectionName, roomId);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as Room) : null;
  } catch (error) {
    console.warn('[roomsStore] getRoomById failed:', error);
    return null;
  }
}

export async function putRoom(room: Room): Promise<void> {
  const store = getStore();
  if (!store) throw new Error('no-db');
  try {
    if (store.kind === 'admin') {
      await store.db.collection(collectionName).doc(room.id).set(room, { merge: true });
      return;
    }

    const ref = doc(store.db, collectionName, room.id);
    await setDoc(ref, room, { merge: true });
  } catch (error) {
    console.warn('[roomsStore] putRoom failed:', error);
    throw error;
  }
}

export async function updateRoom(roomId: string, data: Partial<Room>): Promise<void> {
  const store = getStore();
  if (!store) throw new Error('no-db');
  try {
    if (store.kind === 'admin') {
      await store.db.collection(collectionName).doc(roomId).update(data);
      return;
    }

    const ref = doc(store.db, collectionName, roomId);
    await updateDoc(ref, data as Partial<Room>);
  } catch (error) {
    console.warn('[roomsStore] updateRoom failed:', error);
    throw error;
  }
}

export async function getRoomGameSnapshot(roomId: string): Promise<RoomGameSnapshot | null> {
  const store = getStore();
  if (!store) return null;
  try {
    if (store.kind === 'admin') {
      const snap = await store.db.collection(collectionName).doc(roomId).get();
      if (!snap.exists) return null;
      const data = snap.data() as Room;
      return data.gameSnapshot ?? null;
    }

    const ref = doc(store.db, collectionName, roomId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as Room;
    return data.gameSnapshot ?? null;
  } catch (error) {
    console.warn('[roomsStore] getRoomGameSnapshot failed:', error);
    return null;
  }
}

export async function saveRoomGameSnapshot(roomId: string, snapshot: RoomGameSnapshot): Promise<void> {
  const store = getStore();
  if (!store) throw new Error('no-db');
  try {
    if (store.kind === 'admin') {
      await store.db.collection(collectionName).doc(roomId).update({ gameSnapshot: snapshot });
      return;
    }

    const ref = doc(store.db, collectionName, roomId);
    await updateDoc(ref, { gameSnapshot: snapshot } as Partial<Room>);
  } catch (error) {
    console.warn('[roomsStore] saveRoomGameSnapshot failed:', error);
    throw error;
  }
}


