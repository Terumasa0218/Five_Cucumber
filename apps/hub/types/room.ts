// ルーム管理の型定義

export type RoomSeat = { nickname: string } | null;

export type RoomStatus = 'waiting' | 'playing' | 'closed';

import type { GameConfig, GameState } from '@/lib/game-core';

export interface RoomGameSnapshot {
  state: GameState;
  config: GameConfig;
  version: number;
  updatedAt: number;
}

export interface Room {
  id: string;
  size: number;             // 2..6
  seats: RoomSeat[];        // length === size
  status: RoomStatus;
  createdAt: number;
  // ゲーム設定
  turnSeconds: number;      // ターン時間（秒）
  maxCucumbers: number;     // きゅうり上限
  // フレンド対戦の同期用スナップショット（任意）
  gameSnapshot?: RoomGameSnapshot;
}

export interface CreateRoomRequest {
  roomSize: number;
  nickname: string;
  turnSeconds: number;
  maxCucumbers: number;
}

export interface JoinRoomRequest {
  roomId: string;
  nickname: string;
}

export interface RoomResponse {
  ok: boolean;
  roomId?: string;
  room?: Room;
  reason?: string;
}

