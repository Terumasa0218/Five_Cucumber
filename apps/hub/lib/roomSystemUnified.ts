// 統一されたルームシステム（クライアント・サーバー両対応）

import { Room } from '@/types/room';

// サーバーサイド用メモリストレージ（グローバル）
let serverRooms: Map<string, Room> | null = null;

/**
 * サーバーサイド専用ストレージを取得（メモリのみ）
 */
export function getServerRoomsStorage(): Map<string, Room> {
  // グローバル変数が初期化されていない場合、必ず初期化する
  if (!serverRooms) {
    serverRooms = new Map();
    console.log('[RoomSystem] Initialized server-side room storage');
    console.log('[RoomSystem] Server rooms map created:', serverRooms);
  }
  return serverRooms;
}

/**
 * サーバーサイド専用：すべてのルームを取得
 */
export function getAllServerRooms(): Room[] {
  if (typeof window !== 'undefined') {
    throw new Error('This function is for server-side only');
  }
  const storage = getServerRoomsStorage();
  return Array.from(storage.values());
}

/**
 * サーバーサイド専用：ルームの存在確認
 */
export function hasServerRoom(roomId: string): boolean {
  if (typeof window !== 'undefined') {
    throw new Error('This function is for server-side only');
  }
  const storage = getServerRoomsStorage();
  return storage.has(roomId);
}

/**
 * サーバーサイド専用：メモリストレージからルームを取得
 */
export function getRoomFromMemory(roomId: string): Room | null {
  if (typeof window !== 'undefined') {
    throw new Error('This function is for server-side only');
  }
  const storage = getServerRoomsStorage();
  console.log('[RoomSystem] Getting room from memory:', roomId);
  console.log('[RoomSystem] Available rooms in memory:', Array.from(storage.keys()));
  console.log('[RoomSystem] Storage size:', storage.size);
  console.log('[RoomSystem] Storage object:', storage);

  const room = storage.get(roomId);
  console.log('[RoomSystem] Room found in memory:', room ? 'yes' : 'no');
  if (room) {
    console.log('[RoomSystem] Room data:', JSON.stringify(room, null, 2));
  }

  return room || null;
}

/**
 * サーバーサイド専用：メモリストレージにルームを保存
 */
export function putRoomToMemory(room: Room): void {
  if (typeof window !== 'undefined') {
    throw new Error('This function is for server-side only');
  }
  const storage = getServerRoomsStorage();
  console.log('[RoomSystem] Saving room to memory:', room.id);
  console.log('[RoomSystem] Room data:', JSON.stringify(room, null, 2));
  console.log('[RoomSystem] Storage before save size:', storage.size);
  console.log('[RoomSystem] Storage before save keys:', Array.from(storage.keys()));

  storage.set(room.id, room);
  console.log('[RoomSystem] Saved room to server memory:', room.id);
  console.log('[RoomSystem] Current storage size:', storage.size);
  console.log('[RoomSystem] Available rooms after save:', Array.from(storage.keys()));

  // デバッグ用: 保存されたルームの確認
  const savedRoom = storage.get(room.id);
  console.log('[RoomSystem] Verification - saved room exists:', savedRoom ? 'yes' : 'no');
  if (savedRoom) {
    console.log('[RoomSystem] Verification - saved room data matches:', JSON.stringify(savedRoom) === JSON.stringify(room));
  }
}

/**
 * サーバーサイド専用：メモリストレージからルームを削除
 */
export function deleteRoomFromMemory(roomId: string): boolean {
  if (typeof window !== 'undefined') {
    throw new Error('This function is for server-side only');
  }
  const storage = getServerRoomsStorage();
  return storage.delete(roomId);
}

/**
 * ストレージを取得（環境に応じて切り替え）
 */
function getRoomsStorage(): Map<string, Room> {
  // サーバーサイド
  if (typeof window === 'undefined') {
    if (!serverRooms) {
      serverRooms = new Map();
      console.log('[RoomSystem] Initialized server-side room storage');
    }
    return serverRooms;
  }
  
  // クライアントサイド（localStorage）
  try {
    const stored = localStorage.getItem('five-cucumber-rooms-v2');
    if (!stored) {
      console.log('[RoomSystem] No client-side room storage found');
      return new Map();
    }
    
    const roomsArray = JSON.parse(stored) as Array<[string, Room]>;
    const rooms = new Map(roomsArray);
    console.log('[RoomSystem] Loaded client-side rooms:', rooms.size);
    return rooms;
  } catch (error) {
    console.error('[RoomSystem] Failed to load client-side rooms:', error);
    return new Map();
  }
}

/**
 * ストレージに保存（環境に応じて切り替え）
 */
function saveRoomsToStorage(rooms: Map<string, Room>): void {
  // サーバーサイドはメモリに保存（既に参照で更新済み）
  if (typeof window === 'undefined') {
    serverRooms = rooms;
    console.log('[RoomSystem] Saved server-side rooms:', rooms.size);
    return;
  }
  
  // クライアントサイドはlocalStorageに保存
  try {
    const roomsArray = Array.from(rooms.entries());
    localStorage.setItem('five-cucumber-rooms-v2', JSON.stringify(roomsArray));
    console.log('[RoomSystem] Saved client-side rooms:', rooms.size);
  } catch (error) {
    console.error('[RoomSystem] Failed to save client-side rooms:', error);
  }
}

/**
 * 6桁のルームIDを生成
 */
function generateRoomId(): string {
  const rooms = getRoomsStorage();
  let id: string;
  let attempts = 0;
  
  do {
    id = Math.floor(100000 + Math.random() * 900000).toString(); // 6桁固定 (100000-999999)
    attempts++;
    if (attempts > 100) {
      throw new Error('Failed to generate unique room ID');
    }
  } while (rooms.has(id));
  
  return id;
}

/**
 * 数値を指定範囲内にクランプ
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * ルームを作成（作成者は seats[0] に固定配置）
 */
export function createRoom(roomSize: number, nickname: string, turnSeconds: number = 15, maxCucumbers: number = 6): { success: boolean; roomId?: string; reason?: string } {
  try {
    if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
      return { success: false, reason: 'bad-request' };
    }

    const size = clamp(roomSize, 2, 6);
    const rooms = getRoomsStorage();
    const id = generateRoomId();

    const room: Room = {
      id,
      size,
      seats: Array.from({ length: size }, () => null),
      status: 'waiting',
      createdAt: Date.now(),
      turnSeconds: Math.max(0, turnSeconds),
      maxCucumbers: clamp(maxCucumbers, 4, 7)
    };

    // ★ 作成者は必ず先頭席（seats[0]）に配置
    room.seats[0] = { nickname: nickname.trim() };

    rooms.set(id, room);
    saveRoomsToStorage(rooms);

    return { success: true, roomId: id };
  } catch (error) {
    console.error('Room creation error:', error);
    return { success: false, reason: 'server-error' };
  }
}

/**
 * ルームに参加（最小indexの空席に着席、同名なら既存席を返して冪等）
 */
export function joinRoom(roomId: string, nickname: string): { success: boolean; roomId?: string; reason?: string } {
  try {
    console.log(`[RoomSystem] Attempting to join room ${roomId} with nickname: ${nickname}`);
    
    if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
      console.log('[RoomSystem] Invalid nickname provided');
      return { success: false, reason: 'bad-request' };
    }

    const rooms = getRoomsStorage();
    const room = rooms.get(roomId);

    if (!room) {
      console.log(`[RoomSystem] Room ${roomId} not found`);
      return { success: false, reason: 'not-found' };
    }

    if (room.status !== 'waiting') {
      console.log(`[RoomSystem] Room ${roomId} is not in waiting status: ${room.status}`);
      return { success: false, reason: 'locked' };
    }

    const trimmedNickname = nickname.trim();
    console.log(`[RoomSystem] Room ${roomId} current seats:`, room.seats.map((s, i) => `${i}: ${s?.nickname || 'empty'}`));

    // 既に着席済み（同名）の場合はそのままOK（再入室）
    const existingIndex = room.seats.findIndex(s => s && s.nickname === trimmedNickname);
    if (existingIndex >= 0) {
      console.log(`[RoomSystem] Player ${trimmedNickname} already in room at seat ${existingIndex}`);
      return { success: true, roomId };
    }

    // 空席検索して着席
    const emptyIndex = room.seats.findIndex(s => s === null);
    if (emptyIndex === -1) {
      console.log(`[RoomSystem] Room ${roomId} is full`);
      return { success: false, reason: 'full' };
    }

    room.seats[emptyIndex] = { nickname: trimmedNickname };
    rooms.set(roomId, room);
    saveRoomsToStorage(rooms);

    console.log(`[RoomSystem] Player ${trimmedNickname} successfully joined room ${roomId} at seat ${emptyIndex}`);
    return { success: true, roomId };
  } catch (error) {
    console.error('Room join error:', error);
    return { success: false, reason: 'server-error' };
  }
}

/**
 * ルームを取得
 */
export function getRoom(roomId: string): Room | null {
  try {
    const rooms = getRoomsStorage();
    return rooms.get(roomId) || null;
  } catch (error) {
    console.error('Room get error:', error);
    return null;
  }
}

/**
 * ルームから退出
 */
export function leaveRoom(roomId: string, nickname: string): boolean {
  try {
    if (!nickname || typeof nickname !== 'string') return false;

    const rooms = getRoomsStorage();
    const room = rooms.get(roomId);

    if (!room) return false;

    const trimmedNickname = nickname.trim();
    const seatIndex = room.seats.findIndex(s => s && s.nickname === trimmedNickname);

    if (seatIndex === -1) return false;

    room.seats[seatIndex] = null;
    rooms.set(roomId, room);
    saveRoomsToStorage(rooms);

    return true;
  } catch (error) {
    console.error('Room leave error:', error);
    return false;
  }
}

/**
 * ルームのステータスを更新
 */
export function updateRoomStatus(roomId: string, status: Room['status']): boolean {
  try {
    const rooms = getRoomsStorage();
    const room = rooms.get(roomId);

    if (!room) return false;

    room.status = status;
    rooms.set(roomId, room);
    saveRoomsToStorage(rooms);

    return true;
  } catch (error) {
    console.error('Room status update error:', error);
    return false;
  }
}

/**
 * 全ルームを取得（デバッグ用）
 */
export function getAllRooms(): Room[] {
  try {
    const rooms = getRoomsStorage();
    return Array.from(rooms.values());
  } catch (error) {
    console.error('Get all rooms error:', error);
    return [];
  }
}

/**
 * クライアント側のlocalStorageにルームを追加/更新（フォールバック用）
 */
export function upsertLocalRoom(room: Room): void {
  try {
    const rooms = getRoomsStorage();
    rooms.set(room.id, room);
    saveRoomsToStorage(rooms);
  } catch (error) {
    console.error('Upsert local room error:', error);
  }
}