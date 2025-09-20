import { redis, isRedisAvailable } from './redis';
import type { Room, RoomGameSnapshot } from '@/types/room';

const key = (id: string) => `room:${id}`;

export async function getRoomByIdRedis(roomId: string): Promise<Room | null> {
  if (!isRedisAvailable()) {
    console.log('[Redis] Vercel KV not available, skipping Redis operations');
    return null;
  }

  try {
    console.log('[Redis] Getting room from KV:', key(roomId));
    const s = await redis.get<string>(key(roomId));
    if (!s) return null;
    return JSON.parse(s) as Room;
  } catch (error) {
    console.warn('[Redis] Failed to get room from KV:', error);
    return null;
  }
}

export async function putRoomRedis(room: Room): Promise<void> {
  if (!isRedisAvailable()) {
    console.log('[Redis] Vercel KV not available, skipping Redis save');
    return;
  }

  try {
    console.log('[Redis] Saving room to KV:', key(room.id));
    await redis.set(key(room.id), JSON.stringify(room));
  } catch (error) {
    console.warn('[Redis] Failed to save room to KV:', error);
    throw error;
  }
}

export async function updateRoomRedis(roomId: string, patch: Partial<Room>): Promise<boolean> {
  if (!isRedisAvailable()) {
    console.log('[Redis] Vercel KV not available, skipping Redis update');
    return false;
  }

  try {
    console.log('[Redis] Updating room in KV:', key(roomId));
    const s = await redis.get<string>(key(roomId));
    if (!s) return false;
    const current = JSON.parse(s) as Room;
    const next = { ...current, ...patch } as Room;
    await redis.set(key(roomId), JSON.stringify(next));
    return true;
  } catch (error) {
    console.warn('[Redis] Failed to update room in KV:', error);
    return false;
  }
}

export async function getRoomGameSnapshotRedis(roomId: string): Promise<RoomGameSnapshot | null> {
  const room = await getRoomByIdRedis(roomId);
  return room?.gameSnapshot ?? null;
}

export async function saveRoomGameSnapshotRedis(roomId: string, snapshot: RoomGameSnapshot): Promise<void> {
  await updateRoomRedis(roomId, { gameSnapshot: snapshot });
}


