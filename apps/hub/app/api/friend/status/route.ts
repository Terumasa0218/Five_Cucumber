import { NextRequest, NextResponse } from 'next/server';
import { json } from '@/lib/http';
import { updateRoom } from '@/lib/roomsStore';
import { updateRoomRedis } from '@/lib/roomsRedis';
import { updateRoomStatus, getRoomFromMemory, putRoomToMemory } from '@/lib/roomSystemUnified';
import { isRedisAvailable } from '@/lib/redis';
import { kv } from '@vercel/kv';

const keyOf = (id: string) => `friend:room:${id}`;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { roomId, status } = body as { roomId?: string; status?: 'waiting' | 'playing' | 'closed' };

    if (!roomId || !status) {
      return json({ ok: false, reason: 'bad-request' }, 400);
    }

    const rid = roomId.trim();
    const hasRedisAvailable = isRedisAvailable();
    const isProd = process.env.VERCEL_ENV === 'production';

    // 1) KV を単一のソースとして更新
    try {
      const room = await kv.get<any>(keyOf(rid));
      if (room) {
        room.status = status;
        await kv.set(keyOf(rid), room, { ex: 60 * 30 });
        return json({ ok: true }, 200);
      }
    } catch (e) {
      console.warn('[API] Status KV update failed or room not found in KV, falling back:', e);
    }

    // 2) 既存ストアを更新しつつ、見つかったら KV にも同期
    let syncedToKv = false;

    try {
      await updateRoom(rid, { status });
      try {
        const r = await kv.get<any>(keyOf(rid));
        if (r) {
          r.status = status;
          await kv.set(keyOf(rid), r, { ex: 60 * 30 });
        }
      } catch {}
      return json({ ok: true }, 200);
    } catch {
      // ignore
    }

    if (hasRedisAvailable) {
      const updated = await updateRoomRedis(rid, { status } as any);
      if (updated) {
        try {
          const r = await kv.get<any>(keyOf(rid));
          if (r) {
            r.status = status;
            await kv.set(keyOf(rid), r, { ex: 60 * 30 });
            syncedToKv = true;
          }
        } catch {}
        return json({ ok: true }, 200);
      }
    }

    // 3) 本番ではメモリフォールバック禁止、ただし開発では許可し KV へも同期試行
    if (!isProd) {
      const memoryRoom = getRoomFromMemory(rid);
      if (memoryRoom) {
        memoryRoom.status = status;
        putRoomToMemory(memoryRoom);
        try {
          await kv.set(keyOf(rid), memoryRoom, { ex: 60 * 30 });
          syncedToKv = true;
        } catch {}
      return json({ ok: true }, 200);
      }
    }

    const ok = updateRoomStatus(rid, status);
    if (!ok) {
      return json({ ok: false, reason: 'not-found' }, 404);
    }
    try {
      const r = await kv.get<any>(keyOf(rid));
      if (r) {
        r.status = status;
        await kv.set(keyOf(rid), r, { ex: 60 * 30 });
        syncedToKv = true;
      }
    } catch {}

    return json({ ok: true }, 200);
  } catch (error) {
    console.error('[API] status update error:', error);
    return json({ ok: false, reason: 'server-error' }, 500);
  }
}


