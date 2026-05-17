"use client";
import * as Ably from 'ably';
import type { Types } from 'ably';
import { apiJson } from '@/lib/api';

const DEBUG_ROOMS = process.env.NEXT_PUBLIC_DEBUG_ROOMS === '1';
const debugLog = (...args: unknown[]) => {
  if (DEBUG_ROOMS) console.log(...args);
};
const debugWarn = (...args: unknown[]) => {
  if (DEBUG_ROOMS) console.warn(...args);
};

type AblyTokenResponse =
  | { ok: true; token: Types.TokenRequest }
  | { ok: false; reason: string; message?: string };

export function makeClient(clientId: string, channelName: string): Types.RealtimePromise {
  debugLog('[Ably] Creating client for user:', clientId, 'channel:', channelName);

  const authCallback: NonNullable<Types.AuthOptions['authCallback']> = async (_tokenParams, callback) => {
    try {
      const qs = new URLSearchParams({ channel: channelName, rnd: Date.now().toString() }).toString();
      const data = await apiJson<AblyTokenResponse>(`/api/ably/token?${qs}`);
      if (!data.ok) {
        throw new Error(data.reason);
      }
      callback(null, data.token);
    } catch (error) {
      debugWarn('[Ably] authCallback error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      callback(errorMessage, null);
    }
  };

  const clientOptions: Types.ClientOptions = {
    authUrl: `/api/ably/token`,
    authParams: {
      channel: channelName,
      rnd: Date.now().toString(),
    },
    authCallback,
    clientId,
    autoConnect: true,
    transportParams: {
      heartbeatInterval: 30000,
      disconnectedRetryTimeout: 15000,
      suspendedRetryTimeout: 30000,
    },
    disconnectedRetryTimeout: 15000,
    suspendedRetryTimeout: 30000,
  };

  const client: Types.RealtimePromise = new Ably.Realtime.Promise(clientOptions);

  // 接続状態を監視
  client.connection.on('connecting', () => {
    debugLog('[Ably] Connecting...');
  });

  client.connection.on('connected', () => {
    debugLog('[Ably] Connected successfully');
  });

  client.connection.on('failed', (stateChange) => {
    debugWarn('[Ably] Connection failed:', stateChange.reason);
  });

  client.connection.on('disconnected', () => {
    debugWarn('[Ably] Disconnected - will auto-reconnect');
  });

  client.connection.on('suspended', () => {
    debugWarn('[Ably] Connection suspended - will retry');
  });

  return client;
}


