"use client";
import * as Ably from 'ably';

export function makeClient(uid: string, channelName: string) {
  console.log('[Ably] Creating client for user:', uid, 'channel:', channelName);

  const client = new Ably.Realtime.Promise({
    authUrl: `/api/ably/token?uid=${encodeURIComponent(uid)}&channel=${encodeURIComponent(channelName)}`,
    autoConnect: true,
    debug: {
      enable: process.env.NODE_ENV === 'development'
    }
  } as any);

  // 接続状態を監視
  client.connection.on('connecting', () => {
    console.log('[Ably] Connecting...');
  });

  client.connection.on('connected', () => {
    console.log('[Ably] Connected successfully');
  });

  client.connection.on('failed', (stateChange) => {
    console.error('[Ably] Connection failed:', stateChange.reason);
  });

  client.connection.on('disconnected', () => {
    console.warn('[Ably] Disconnected - will auto-reconnect');
  });

  return client;
}


