import { redis } from './redis';
import type { Room, RoomGameSnapshot } from '@/types/room';

const key = (id: string) => `room:${id}`;

export async function getRoomByIdRedis(roomId: string): Promise<Room | null> {
  // Vercel KVは自動的に利用可能なのでチェック不要
  const s = await redis.get<string>(key(roomId));
  if (!s) return null;
  try { return JSON.parse(s) as Room; } catch { return null; }
}

export async function putRoomRedis(room: Room): Promise<void> {
  // Vercel KVは自動的に利用可能なのでチェック不要
  await redis.set(key(room.id), JSON.stringify(room));
}

export async function updateRoomRedis(roomId: string, patch: Partial<Room>): Promise<boolean> {
  // Vercel KVは自動的に利用可能なのでチェック不要
  const s = await redis.get<string>(key(roomId));
  if (!s) return false;
  const current = JSON.parse(s) as Room;
  const next = { ...current, ...patch } as Room;
  await redis.set(key(roomId), JSON.stringify(next));
  return true;
}

export async function getRoomGameSnapshotRedis(roomId: string): Promise<RoomGameSnapshot | null> {
  const room = await getRoomByIdRedis(roomId);
  return room?.gameSnapshot ?? null;
}

export async function saveRoomGameSnapshotRedis(roomId: string, snapshot: RoomGameSnapshot): Promise<void> {
  await updateRoomRedis(roomId, { gameSnapshot: snapshot });
}


