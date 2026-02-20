import Ably from 'ably/promises';
import { kv } from '@vercel/kv';
import { verifyAuth } from '@/lib/auth';
import { json } from '@/lib/http';
import type { Room } from '@/types/room';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizeId(raw: string | null): string {
  return (raw || '').replace(/[^-\w]/g, '').slice(0, 64);
}

function parseUserChannel(channelRaw: string | null): { roomId: string; participant: string } | null {
  const channel = (channelRaw || '').trim();
  const match = /^room-([\w-]{1,64})-user-([\w-]{1,64})$/.exec(channel);
  if (!match) return null;
  return { roomId: sanitizeId(match[1] ?? ''), participant: sanitizeId(match[2] ?? '') };
}

async function checkUserInRoom(roomId: string, authUid: string, participant: string): Promise<boolean> {
  const room = await kv.get<Room>(`friend:room:${roomId}`);
  if (!room) return false;

  return room.seats.some((seat) => {
    if (!seat) return false;
    return seat.nickname === authUid || seat.nickname === participant;
  });
}

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  try {
    const url = new URL(req.url);
    const channelInfo = parseUserChannel(url.searchParams.get('channel'));
    if (!channelInfo?.roomId || !channelInfo.participant) {
      return json({ ok: false, reason: 'bad-channel' }, 400);
    }

    const isParticipant = await checkUserInRoom(channelInfo.roomId, auth.uid, channelInfo.participant);
    if (!isParticipant) {
      return json({ error: 'Forbidden' }, 403);
    }

    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      return json({ ok: false, reason: 'no-ably-key' }, 500);
    }

    const ably = new Ably.Rest(apiKey);
    const token = await ably.auth.createTokenRequest({
      clientId: auth.uid,
      capability: {
        [`room-${channelInfo.roomId}-user-${channelInfo.participant}`]: ['publish', 'subscribe'],
      },
    });

    return json({ ok: true, token });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ ok: false, reason: 'server-error', message }, 500);
  }
}

export async function OPTIONS() {
  return json({ ok: true });
}
