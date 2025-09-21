"use client";
import * as Ably from 'ably';

export function makeClient(uid: string, channelName: string) {
  console.log('[Ably] Creating client for user:', uid, 'channel:', channelName);

  const client = new Ably.Realtime.Promise({
    authUrl: `/api/ably/token`,
    authParams: {
      uid,
      channel: channelName,
      rnd: Date.now().toString(),
    },
    clientId: uid,
    autoConnect: true,
    // スマホ対応: タイムアウトと再接続設定を強化
    transportParams: {
      heartbeatInterval: 30000, // 30秒
      disconnectedRetryTimeout: 15000, // 15秒
      suspendedRetryTimeout: 30000, // 30秒
    },
    // スマホ対応: 再接続設定
    disconnectedRetryTimeout: 15000,
    suspendedRetryTimeout: 30000,
    // デバッグ設定
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

  client.connection.on('suspended', () => {
    console.warn('[Ably] Connection suspended - will retry');
  });

  return client;
}


