import { getRedis } from './redis';
import type { Room, RoomGameSnapshot } from '@/types/room';

const key = (id: string) => `room:${id}`;
export const ROOM_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export async function getRoomByIdRedis(roomId: string): Promise<Room | null> {
  const redis = getRedis();
  if (!redis) return null;

  const s = await redis.get<string>(key(roomId));
  if (!s) return null;
  try { return JSON.parse(s) as Room; } catch { return null; }
}

export async function putRoomRedis(room: Room): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  await redis.set(key(room.id), JSON.stringify(room), { ex: ROOM_TTL_SECONDS });
}

export async function updateRoomRedis(roomId: string, patch: Partial<Room>): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  const s = await redis.get<string>(key(roomId));
  if (!s) return false;
  const current = JSON.parse(s) as Room;
  const next = { ...current, ...patch } as Room;
  await redis.set(key(roomId), JSON.stringify(next), { ex: ROOM_TTL_SECONDS });
  return true;
}

export async function getRoomGameSnapshotRedis(roomId: string): Promise<RoomGameSnapshot | null> {
  const room = await getRoomByIdRedis(roomId);
  return room?.gameSnapshot ?? null;
}

export async function saveRoomGameSnapshotRedis(roomId: string, snapshot: RoomGameSnapshot): Promise<void> {
  await updateRoomRedis(roomId, { gameSnapshot: snapshot });
}


