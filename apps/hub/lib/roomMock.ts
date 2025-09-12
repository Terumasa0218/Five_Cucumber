export interface RoomSettings {
  size: number;
  cucumber: number;
  limit: number;
}

export interface Room {
  code: string;
  size: number;
  cucumber: number;
  limit: number;
  participants: string[];
}

// localStorage基盤のルームデータベース
const ROOMS_KEY = 'five-cucumber-rooms';

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
 * ルームを作成
 */
export function createRoom(settings: RoomSettings): Room {
  const rooms = getRoomsFromStorage();
  const code = generateRoomCode(rooms);
  const room: Room = {
    code,
    size: settings.size,
    cucumber: settings.cucumber,
    limit: settings.limit,
    participants: []
  };
  
  rooms.set(code, room);
  saveRoomsToStorage(rooms);
  return room;
}

/**
 * ルームコードを検証
 */
export function validateRoomCode(code: string): boolean {
  const rooms = getRoomsFromStorage();
  return rooms.has(code);
}

/**
 * ルームを取得
 */
export function getRoom(code: string): Room | null {
  const rooms = getRoomsFromStorage();
  return rooms.get(code) || null;
}

/**
 * ルームに参加者を追加
 */
export function addParticipant(code: string, nickname: string): boolean {
  const rooms = getRoomsFromStorage();
  const room = rooms.get(code);
  if (!room || room.participants.length >= room.size) {
    return false;
  }
  
  room.participants.push(nickname);
  rooms.set(code, room);
  saveRoomsToStorage(rooms);
  return true;
}

/**
 * ルームから参加者を削除
 */
export function removeParticipant(code: string, nickname: string): boolean {
  const rooms = getRoomsFromStorage();
  const room = rooms.get(code);
  if (!room) {
    return false;
  }
  
  const index = room.participants.indexOf(nickname);
  if (index === -1) {
    return false;
  }
  
  room.participants.splice(index, 1);
  rooms.set(code, room);
  saveRoomsToStorage(rooms);
  return true;
}

/**
 * 5桁のルームコードを生成
 */
function generateRoomCode(rooms: Map<string, Room>): string {
  let code: string;
  do {
    code = Math.floor(10000 + Math.random() * 90000).toString();
  } while (rooms.has(code));
  
  return code;
}
