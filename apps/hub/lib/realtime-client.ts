"use client";
import * as Ably from 'ably';

export function makeClient(uid: string, channelName: string) {
  const client = new Ably.Realtime.Promise({
    authUrl: `/api/ably/token?uid=${encodeURIComponent(uid)}&channel=${encodeURIComponent(channelName)}`,
  } as any);
  return client;
}


