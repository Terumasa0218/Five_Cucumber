// サーバーサイド用ルームシステム（メモリ内ストレージ）

import { Room } from '@/types/room';

// グローバルなメモリ内ストレージ
const rooms = new Map<string, Room>();

/**
 * 4-6桁のルームIDを生成
 */
function generateRoomId(): string {
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
  try {
    if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
      return { success: false, reason: 'bad-request' };
    }

    const size = clamp(roomSize, 2, 6);
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
  return rooms.get(roomId) || null;
}

/**
 * ルームから退出
 */
export function leaveRoom(roomId: string, nickname: string): boolean {
  try {
    if (!nickname || typeof nickname !== 'string') return false;

    const room = rooms.get(roomId);

    if (!room) return false;

    const trimmedNickname = nickname.trim();
    const seatIndex = room.seats.findIndex(s => s && s.nickname === trimmedNickname);

    if (seatIndex === -1) return false;

    room.seats[seatIndex] = null;
    rooms.set(roomId, room);

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
    const room = rooms.get(roomId);

    if (!room) return false;

    room.status = status;
    rooms.set(roomId, room);

    return true;
  } catch (error) {
    console.error('Room status update error:', error);
    return false;
  }
}
