import { db } from '@/lib/firebase';
import { Room, RoomGameSnapshot } from '@/types/room';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const collectionName = 'rooms';

export async function getRoomById(roomId: string): Promise<Room | null> {
  if (!db) return null;

  try {
    const ref = doc(db, collectionName, roomId);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as Room) : null;
  } catch (error) {
    console.warn('[roomsStore] getRoomById failed:', error);
    return null;
  }
}

export async function putRoom(room: Room): Promise<void> {
  if (!db) throw new Error('no-db');
  try {
    const ref = doc(db, collectionName, room.id);
    await setDoc(ref, room, { merge: true });
  } catch (error) {
    console.warn('[roomsStore] putRoom failed:', error);
    throw error;
  }
}

export async function updateRoom(roomId: string, data: Partial<Room>): Promise<void> {
  if (!db) throw new Error('no-db');
  try {
    const ref = doc(db, collectionName, roomId);
    await updateDoc(ref, data as Partial<Room>);
  } catch (error) {
    console.warn('[roomsStore] updateRoom failed:', error);
    throw error;
  }
}

export async function getRoomGameSnapshot(roomId: string): Promise<RoomGameSnapshot | null> {
  if (!db) return null;
  try {
    const ref = doc(db, collectionName, roomId);
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
  if (!db) throw new Error('no-db');
  try {
    const ref = doc(db, collectionName, roomId);
    await updateDoc(ref, { gameSnapshot: snapshot } as Partial<Room>);
  } catch (error) {
    console.warn('[roomsStore] saveRoomGameSnapshot failed:', error);
    throw error;
  }
}


