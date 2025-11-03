"use client";
import * as Ably from 'ably';
import type { Types } from 'ably';
import { apiJson } from '@/lib/api';

type AblyTokenResponse =
  | { ok: true; token: Types.TokenRequest }
  | { ok: false; reason: string; message?: string };

export function makeClient(uid: string, channelName: string): Ably.RealtimePromise {
  console.log('[Ably] Creating client for user:', uid, 'channel:', channelName);

  const authCallback: NonNullable<Types.AuthOptions['authCallback']> = async (_tokenParams, callback) => {
    try {
      const qs = new URLSearchParams({ uid, channel: channelName, rnd: Date.now().toString() }).toString();
      const data = await apiJson<AblyTokenResponse>(`/api/ably/token?${qs}`);
      if (!data.ok) {
        throw new Error(data.reason);
      }
      callback(null, data.token);
    } catch (error) {
      console.error('[Ably] authCallback error:', error);
      callback(error instanceof Error ? error : new Error(String(error)), null);
    }
  };

  const clientOptions: Types.ClientOptions = {
    authUrl: `/api/ably/token`,
    authParams: {
      uid,
      channel: channelName,
      rnd: Date.now().toString(),
    },
    authCallback,
    clientId: uid,
    autoConnect: true,
    transportParams: {
      heartbeatInterval: 30000,
      disconnectedRetryTimeout: 15000,
      suspendedRetryTimeout: 30000,
    },
    disconnectedRetryTimeout: 15000,
    suspendedRetryTimeout: 30000,
    debug: process.env.NODE_ENV === 'development',
  };

  const client = new Ably.Realtime.Promise(clientOptions);

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


