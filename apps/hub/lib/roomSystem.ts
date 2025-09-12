'use client';

import { Room } from '@/types/room';

const ROOMS_KEY = 'five-cucumber-rooms-v2';

/**
 * localStorage からルーム一覧を取得
 */
function getRoomsFromStorage(): Map<string, Room> {
  if (typeof window === 'undefined') return new Map();
  
  try {
    const stored = localStorage.getItem(ROOMS_KEY);
    if (!stored) return new Map();
    
    const roomsArray = JSON.parse(stored) as Array<[string, Room]>;
    return new Map(roomsArray);
  } catch {
    return new Map();
  }
}

/**
 * ルーム一覧を localStorage に保存
 */
function saveRoomsToStorage(rooms: Map<string, Room>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const roomsArray = Array.from(rooms.entries());
    localStorage.setItem(ROOMS_KEY, JSON.stringify(roomsArray));
  } catch {
    // エラーは無視
  }
}

/**
 * 4-6桁のルームIDを生成
 */
function generateRoomId(rooms: Map<string, Room>): string {
  let id: string;
  do {
    id = Math.floor(1000 + Math.random() * 900000).toString(); // 4-6桁
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
  if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
    return { success: false, reason: 'bad-request' };
  }

  const size = clamp(roomSize, 2, 6);
  const rooms = getRoomsFromStorage();
  const id = generateRoomId(rooms);

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
}

/**
 * ルームに参加（最小indexの空席に着席、同名なら既存席を返して冪等）
 */
export function joinRoom(roomId: string, nickname: string): { success: boolean; roomId?: string; reason?: string } {
  if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
    return { success: false, reason: 'bad-request' };
  }

  const rooms = getRoomsFromStorage();
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
}

/**
 * ルームを取得
 */
export function getRoom(roomId: string): Room | null {
  const rooms = getRoomsFromStorage();
  return rooms.get(roomId) || null;
}

/**
 * ルームから退出
 */
export function leaveRoom(roomId: string, nickname: string): boolean {
  if (!nickname || typeof nickname !== 'string') return false;

  const rooms = getRoomsFromStorage();
  const room = rooms.get(roomId);

  if (!room) return false;

  const trimmedNickname = nickname.trim();
  const seatIndex = room.seats.findIndex(s => s && s.nickname === trimmedNickname);

  if (seatIndex === -1) return false;

  room.seats[seatIndex] = null;
  rooms.set(roomId, room);
  saveRoomsToStorage(rooms);

  return true;
}

/**
 * ルームのステータスを更新
 */
export function updateRoomStatus(roomId: string, status: Room['status']): boolean {
  const rooms = getRoomsFromStorage();
  const room = rooms.get(roomId);

  if (!room) return false;

  room.status = status;
  rooms.set(roomId, room);
  saveRoomsToStorage(rooms);

  return true;
}

