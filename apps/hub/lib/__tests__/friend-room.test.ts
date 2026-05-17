import { describe, expect, it } from 'vitest';
import {
  canStartRoom,
  createFriendRoom,
  getSeatIndex,
  isValidRoomId,
  joinRoomSnapshot,
  normalizeFriendRoomSettings,
  normalizeRoomId,
} from '../friend-room';

describe('friend-room helpers', () => {
  it('ルームIDを6桁数字に正規化して検証する', () => {
    expect(normalizeRoomId('12-34 56 789')).toBe('123456');
    expect(isValidRoomId('123456')).toBe(true);
    expect(isValidRoomId('12345')).toBe(false);
    expect(isValidRoomId('abcdef')).toBe(false);
  });

  it('フレンドルーム設定を許可範囲に丸める', () => {
    expect(normalizeFriendRoomSettings({ roomSize: 9, turnSeconds: -1, maxCucumbers: 99 })).toEqual({
      roomSize: 6,
      turnSeconds: 0,
      maxCucumbers: 7,
    });
    expect(normalizeFriendRoomSettings({ roomSize: 1, turnSeconds: 45, maxCucumbers: 2 })).toEqual({
      roomSize: 2,
      turnSeconds: 30,
      maxCucumbers: 4,
    });
  });

  it('作成者をホスト席に固定してルームを作成する', () => {
    const room = createFriendRoom({
      id: '123456',
      nickname: ' host ',
      roomSize: 3,
      turnSeconds: 15,
      maxCucumbers: 5,
      createdAt: 100,
    });

    expect(room.id).toBe('123456');
    expect(room.seats).toEqual([{ nickname: 'host' }, null, null]);
    expect(getSeatIndex(room, 'host')).toBe(0);
  });

  it('同名参加は冪等で、空席には最小indexから着席する', () => {
    const room = createFriendRoom({
      id: '123456',
      nickname: 'host',
      roomSize: 3,
      turnSeconds: 15,
      maxCucumbers: 5,
    });

    const firstJoin = joinRoomSnapshot(room, 'guest');
    expect(firstJoin.ok).toBe(true);
    if (!firstJoin.ok) throw new Error('unexpected join failure');
    expect(firstJoin.seatIndex).toBe(1);
    expect(firstJoin.room.seats[1]).toEqual({ nickname: 'guest' });

    const secondJoin = joinRoomSnapshot(firstJoin.room, 'guest');
    expect(secondJoin.ok).toBe(true);
    if (!secondJoin.ok) throw new Error('unexpected rejoin failure');
    expect(secondJoin.alreadyJoined).toBe(true);
    expect(secondJoin.seatIndex).toBe(1);
  });

  it('満室の新規参加を拒否する', () => {
    const room = createFriendRoom({
      id: '123456',
      nickname: 'host',
      roomSize: 2,
      turnSeconds: 15,
      maxCucumbers: 5,
    });
    const joined = joinRoomSnapshot(room, 'guest');
    if (!joined.ok) throw new Error('unexpected join failure');

    expect(joinRoomSnapshot(joined.room, 'third')).toEqual({ ok: false, reason: 'full' });
  });

  it('ホストかつ満室の待機ルームだけ開始できる', () => {
    const room = createFriendRoom({
      id: '123456',
      nickname: 'host',
      roomSize: 2,
      turnSeconds: 15,
      maxCucumbers: 5,
    });

    expect(canStartRoom(room, 'host')).toEqual({ ok: false, reason: 'not-full' });
    const joined = joinRoomSnapshot(room, 'guest');
    if (!joined.ok) throw new Error('unexpected join failure');
    expect(canStartRoom(joined.room, 'guest')).toEqual({ ok: false, reason: 'host-only' });
    expect(canStartRoom(joined.room, 'host')).toEqual({ ok: true });
  });
});
