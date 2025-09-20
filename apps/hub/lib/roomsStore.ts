import { db } from '@/lib/firebase';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { Room, RoomGameSnapshot } from '@/types/room';
import type { Firestore as AdminFirestore } from 'firebase-admin/firestore';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { Firestore as ClientFirestore } from 'firebase/firestore';

export type RoomStoreErrorCode = 'no-db' | 'permission-denied';

export class RoomStoreError extends Error {
  readonly code: RoomStoreErrorCode;

  constructor(code: RoomStoreErrorCode, message?: string, cause?: unknown) {
    super(message ?? code);
    this.name = 'RoomStoreError';
    this.code = code;
    if (cause !== undefined) {
      (this as any).cause = cause;
    }
  }
}

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

function isPermissionDeniedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { code?: string; message?: string };
  if (maybe.code === 'permission-denied') return true;
  return typeof maybe.message === 'string' && maybe.message.includes('Missing or insufficient permissions');
}

async function getRoomInternal(roomId: string, strict: boolean): Promise<Room | null> {
  const store = getStore();
  if (!store) {
    if (strict) throw new RoomStoreError('no-db');
    return null;
  }

  try {
    if (store.kind === 'admin') {
      const snap = await store.db.collection(collectionName).doc(roomId).get();
      if (!snap.exists) return null;
      const data = snap.data() as Room;
      return data;
    }

    const ref = doc(store.db, collectionName, roomId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as Room;
    return data;
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      if (strict) {
        throw new RoomStoreError('permission-denied', 'Missing Firestore permissions', error);
      }
      console.warn('[roomsStore] getRoomById permission issue:', error);
      return null;
    }
    console.warn('[roomsStore] getRoomById failed:', error);
    if (strict) {
      throw error instanceof Error ? error : new Error(String(error));
    }
    return null;
  }
}

export async function getRoomById(roomId: string): Promise<Room | null> {
  return getRoomInternal(roomId, false);
}

export async function getRoomByIdStrict(roomId: string): Promise<Room | null> {
  return getRoomInternal(roomId, true);
}

export async function putRoom(room: Room): Promise<void> {
  const store = getStore();
  if (!store) throw new RoomStoreError('no-db');
  try {
    if (store.kind === 'admin') {
      await store.db.collection(collectionName).doc(room.id).set(room, { merge: true });
      return;
    }

    const ref = doc(store.db, collectionName, room.id);
    await setDoc(ref, room, { merge: true });
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      throw new RoomStoreError('permission-denied', 'Missing Firestore permissions', error);
    }
    console.warn('[roomsStore] putRoom failed:', error);
    throw error;
  }
}

export async function updateRoom(roomId: string, data: Partial<Room>): Promise<void> {
  const store = getStore();
  if (!store) throw new RoomStoreError('no-db');
  try {
    if (store.kind === 'admin') {
      await store.db.collection(collectionName).doc(roomId).update(data);
      return;
    }

    const ref = doc(store.db, collectionName, roomId);
    await updateDoc(ref, data as Partial<Room>);
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      throw new RoomStoreError('permission-denied', 'Missing Firestore permissions', error);
    }
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
    if (isPermissionDeniedError(error)) {
      throw new RoomStoreError('permission-denied', 'Missing Firestore permissions', error);
    }
    console.warn('[roomsStore] getRoomGameSnapshot failed:', error);
    return null;
  }
}

export async function saveRoomGameSnapshot(roomId: string, snapshot: RoomGameSnapshot): Promise<void> {
  const store = getStore();
  if (!store) throw new RoomStoreError('no-db');
  try {
    if (store.kind === 'admin') {
      await store.db.collection(collectionName).doc(roomId).update({ gameSnapshot: snapshot });
      return;
    }

    const ref = doc(store.db, collectionName, roomId);
    await updateDoc(ref, { gameSnapshot: snapshot } as Partial<Room>);
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      throw new RoomStoreError('permission-denied', 'Missing Firestore permissions', error);
    }
    console.warn('[roomsStore] saveRoomGameSnapshot failed:', error);
    throw error;
  }
}


