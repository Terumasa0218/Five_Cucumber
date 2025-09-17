import { db } from '@/lib/firebase';
import { Room } from '@/types/room';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const collectionName = 'rooms';

export async function getRoomById(roomId: string): Promise<Room | null> {
  const ref = doc(db, collectionName, roomId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Room) : null;
}

export async function putRoom(room: Room): Promise<void> {
  const ref = doc(db, collectionName, room.id);
  await setDoc(ref, room, { merge: true });
}

export async function updateRoom(roomId: string, data: Partial<Room & { seed?: number; gameState?: string; gameConfig?: any }>): Promise<void> {
  const ref = doc(db, collectionName, roomId);
  await updateDoc(ref, data as any);
}


