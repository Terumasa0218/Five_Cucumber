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

// 擬似ルームデータベース
const rooms = new Map<string, Room>();

/**
 * ルームを作成
 */
export function createRoom(settings: RoomSettings): Room {
  const code = generateRoomCode();
  const room: Room = {
    code,
    size: settings.size,
    cucumber: settings.cucumber,
    limit: settings.limit,
    participants: []
  };
  
  rooms.set(code, room);
  return room;
}

/**
 * ルームコードを検証
 */
export function validateRoomCode(code: string): boolean {
  return rooms.has(code);
}

/**
 * ルームを取得
 */
export function getRoom(code: string): Room | null {
  return rooms.get(code) || null;
}

/**
 * ルームに参加者を追加
 */
export function addParticipant(code: string, nickname: string): boolean {
  const room = rooms.get(code);
  if (!room || room.participants.length >= room.size) {
    return false;
  }
  
  room.participants.push(nickname);
  return true;
}

/**
 * ルームから参加者を削除
 */
export function removeParticipant(code: string, nickname: string): boolean {
  const room = rooms.get(code);
  if (!room) {
    return false;
  }
  
  const index = room.participants.indexOf(nickname);
  if (index === -1) {
    return false;
  }
  
  room.participants.splice(index, 1);
  return true;
}

/**
 * 5桁のルームコードを生成
 */
function generateRoomCode(): string {
  let code: string;
  do {
    code = Math.floor(10000 + Math.random() * 90000).toString();
  } while (rooms.has(code));
  
  return code;
}
