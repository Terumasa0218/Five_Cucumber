// 統一されたルームシステム（クライアント・サーバー両対応）

import { Room } from '@/types/room';

// サーバーサイド用メモリストレージ（グローバル）
let serverRooms: Map<string, Room> | null = null;

/**
 * ストレージを取得（環境に応じて切り替え）
 */
function getRoomsStorage(): Map<string, Room> {
  // サーバーサイド
  if (typeof window === 'undefined') {
    if (!serverRooms) {
      serverRooms = new Map();
    }
    return serverRooms;
  }
  
  // クライアントサイド（localStorage）
  try {
    const stored = localStorage.getItem('five-cucumber-rooms-v2');
    if (!stored) return new Map();
    
    const roomsArray = JSON.parse(stored) as Array<[string, Room]>;
    return new Map(roomsArray);
  } catch {
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
    return;
  }
  
  // クライアントサイドはlocalStorageに保存
  try {
    const roomsArray = Array.from(rooms.entries());
    localStorage.setItem('five-cucumber-rooms-v2', JSON.stringify(roomsArray));
  } catch {
    // エラーは無視
  }
}

/**
 * 4-6桁のルームIDを生成
 */
function generateRoomId(): string {
  const rooms = getRoomsStorage();
  let id: string;
  let attempts = 0;
  
  do {
    id = Math.floor(1000 + Math.random() * 900000).toString(); // 4-6桁
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
      maxCucumbers: clamp(maxCucumbers, 4, 6)
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
    if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
      return { success: false, reason: 'bad-request' };
    }

    const rooms = getRoomsStorage();
    const room = rooms.get(roomId);

    if (!room) {
      return { success: false, reason: 'not-found' };
    }

    if (room.status !== 'waiting') {
      return { success: false, reason: 'locked' };
    }

    const trimmedNickname = nickname.trim();

    // 既に着席済み（同名）の場合はそのままOK（再入室）
    const existingIndex = room.seats.findIndex(s => s && s.nickname === trimmedNickname);
    if (existingIndex >= 0) {
      return { success: true, roomId };
    }

    // 空席検索して着席
    const emptyIndex = room.seats.findIndex(s => s === null);
    if (emptyIndex === -1) {
      return { success: false, reason: 'full' };
    }

    room.seats[emptyIndex] = { nickname: trimmedNickname };
    rooms.set(roomId, room);
    saveRoomsToStorage(rooms);

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
