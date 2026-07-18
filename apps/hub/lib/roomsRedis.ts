import type { Room, RoomGameSnapshot } from '@/types/room';
import { isRedisAvailable, redis } from './redis';

const key = (id: string) => `friend:room:${id}`;
const DEBUG_ROOMS = process.env.NEXT_PUBLIC_DEBUG_ROOMS === '1';
const debugLog = (...args: unknown[]) => {
  if (DEBUG_ROOMS) console.log(...args);
};
const debugWarn = (...args: unknown[]) => {
  if (DEBUG_ROOMS) console.warn(...args);
};

export async function getRoomByIdRedis(roomId: string): Promise<Room | null> {
  if (!isRedisAvailable()) {
    debugLog('[Redis] Vercel KV not available, skipping Redis operations');
    return null;
  }

  try {
    debugLog('[Redis] Getting room from KV:', key(roomId));
    const obj = await redis.get<Room>(key(roomId));
    if (!obj) return null;
    return obj as Room;
  } catch (error) {
    debugWarn('[Redis] Failed to get room from KV:', error);
    return null;
  }
}

export async function putRoomRedis(room: Room): Promise<void> {
  if (!isRedisAvailable()) {
    debugLog('[Redis] Vercel KV not available, skipping Redis save');
    return;
  }

  try {
    debugLog('[Redis] Saving room to KV:', key(room.id));
    await redis.set(key(room.id), room);
  } catch (error) {
    debugWarn('[Redis] Failed to save room to KV:', error);
    throw error;
  }
}

export async function updateRoomRedis(roomId: string, patch: Partial<Room>): Promise<boolean> {
  if (!isRedisAvailable()) {
    debugLog('[Redis] Vercel KV not available, skipping Redis update');
    return false;
  }

  try {
    debugLog('[Redis] Updating room in KV:', key(roomId));
    const current = await redis.get<Room>(key(roomId));
    if (!current) return false;
    const next = { ...current, ...patch } as Room;
    await redis.set(key(roomId), next);
    return true;
  } catch (error) {
    debugWarn('[Redis] Failed to update room in KV:', error);
    return false;
  }
}

export async function getRoomGameSnapshotRedis(roomId: string): Promise<RoomGameSnapshot | null> {
  const room = await getRoomByIdRedis(roomId);
  return room?.gameSnapshot ?? null;
}

export async function saveRoomGameSnapshotRedis(roomId: string, snapshot: RoomGameSnapshot): Promise<void> {
  const updated = await updateRoomRedis(roomId, { gameSnapshot: snapshot });
  if (!updated) throw new Error('room-not-found');
}


