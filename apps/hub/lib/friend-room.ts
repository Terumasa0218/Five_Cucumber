import type { Room, RoomSeat } from '@/types/room';

export const FRIEND_ROOM_ID_PATTERN = /^\d{6}$/;

export type FriendRoomSettings = {
  roomSize: number;
  turnSeconds: number;
  maxCucumbers: number;
};

export type FriendRoomCreateInput = FriendRoomSettings & {
  id: string;
  nickname: string;
  uid?: string;
  createdAt?: number;
  seed?: number;
};

export type RoomJoinResult =
  | { ok: true; room: Room; seatIndex: number; alreadyJoined: boolean }
  | { ok: false; reason: 'bad-request' | 'not-found' | 'locked' | 'full' | 'duplicate-nickname' };

export function normalizeRoomId(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\D/g, '').slice(0, 6);
}

export function isValidRoomId(value: unknown): boolean {
  return FRIEND_ROOM_ID_PATTERN.test(typeof value === 'string' ? value : String(value ?? ''));
}

export function normalizeNickname(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeUid(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(numberValue)));
}

export function normalizeFriendRoomSettings(settings: Partial<FriendRoomSettings>): FriendRoomSettings {
  return {
    roomSize: clampNumber(settings.roomSize, 2, 6, 4),
    turnSeconds: clampNumber(settings.turnSeconds, 0, 30, 15),
    maxCucumbers: clampNumber(settings.maxCucumbers, 4, 7, 5),
  };
}

export function createFriendRoom(input: FriendRoomCreateInput): Room {
  const nickname = normalizeNickname(input.nickname);
  const uid = normalizeUid(input.uid);
  if (!isValidRoomId(input.id) || !nickname) {
    throw new Error('bad-request');
  }

  const settings = normalizeFriendRoomSettings(input);
  const room: Room = {
    id: input.id,
    size: settings.roomSize,
    seats: Array.from({ length: settings.roomSize }, () => null),
    status: 'waiting',
    createdAt: input.createdAt ?? Date.now(),
    turnSeconds: settings.turnSeconds,
    maxCucumbers: settings.maxCucumbers,
    seed: input.seed,
  };
  room.seats[0] = uid ? { nickname, uid } : { nickname };
  return room;
}

export function countJoinedPlayers(room: Room): number {
  return room.seats.filter((seat): seat is Exclude<RoomSeat, null> => seat !== null).length;
}

export function getSeatIndex(room: Room, nickname: string, uidInput?: string | null): number {
  const normalized = normalizeNickname(nickname);
  const uid = normalizeUid(uidInput);
  if (!normalized && !uid) return -1;

  if (uid) {
    const uidIndex = room.seats.findIndex((seat) => seat?.uid === uid);
    if (uidIndex >= 0) return uidIndex;

    // Older rooms may not have uid saved yet. Allow one-time nickname fallback for compatibility.
    if (normalized) {
      return room.seats.findIndex((seat) => !seat?.uid && seat?.nickname === normalized);
    }
    return -1;
  }

  return room.seats.findIndex((seat) => seat?.nickname === normalized);
}

export function isRoomHost(room: Room, nickname: string, uid?: string | null): boolean {
  const hostSeat = room.seats[0];
  if (!hostSeat) return false;
  const normalizedUid = normalizeUid(uid);
  if (normalizedUid && hostSeat.uid) return hostSeat.uid === normalizedUid;
  return hostSeat.nickname === normalizeNickname(nickname);
}

export function canStartRoom(room: Room, nickname: string, uid?: string | null): { ok: true } | { ok: false; reason: string } {
  if (!isRoomHost(room, nickname, uid)) return { ok: false, reason: 'host-only' };
  if (room.status !== 'waiting') return { ok: false, reason: 'invalid-transition' };
  if (countJoinedPlayers(room) !== room.size) return { ok: false, reason: 'not-full' };
  return { ok: true };
}

export function joinRoomSnapshot(room: Room | null, nicknameInput: unknown, uidInput?: unknown): RoomJoinResult {
  const nickname = normalizeNickname(nicknameInput);
  const uid = normalizeUid(uidInput);
  if (!nickname) return { ok: false, reason: 'bad-request' };
  if (!room) return { ok: false, reason: 'not-found' };
  if (room.status !== 'waiting') return { ok: false, reason: 'locked' };

  const existingIndex = getSeatIndex(room, nickname, uid);
  if (existingIndex >= 0) {
    const existingSeat = room.seats[existingIndex];
    const shouldAttachUid = Boolean(uid && existingSeat && !existingSeat.uid);
    const nextRoom = shouldAttachUid
      ? {
          ...room,
          seats: room.seats.map((seat, index) =>
            index === existingIndex && seat ? { ...seat, uid } : seat
          ),
        }
      : room;

    return {
      ok: true,
      room: nextRoom,
      seatIndex: existingIndex,
      alreadyJoined: true,
    };
  }

  const duplicateNickname = room.seats.some((seat) => seat?.nickname === nickname);
  if (duplicateNickname) return { ok: false, reason: 'duplicate-nickname' };

  const emptyIndex = room.seats.findIndex((seat) => seat === null);
  if (emptyIndex < 0) return { ok: false, reason: 'full' };

  const nextRoom: Room = {
    ...room,
    seats: room.seats.map((seat, index) => (index === emptyIndex ? (uid ? { nickname, uid } : { nickname }) : seat)),
  };

  return {
    ok: true,
    room: nextRoom,
    seatIndex: emptyIndex,
    alreadyJoined: false,
  };
}
