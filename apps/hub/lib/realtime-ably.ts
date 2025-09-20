import * as AblyModule from 'ably';
import type { RealtimeAdapter } from './realtime-adapter';

const Ably: any = (AblyModule as any).default ?? AblyModule;
let restInstance: any | null = null;

function getRest() {
  if (!process.env.ABLY_API_KEY) {
    throw new Error('ABLY_API_KEY environment variable is not set');
  }

  if (!restInstance) {
    console.log('[Ably] Initializing Ably REST client');
    restInstance = new Ably.Rest(process.env.ABLY_API_KEY);
  }
  return restInstance;
}

export const ablyAdapter: RealtimeAdapter = {
  async publishToUser(roomId, uid, event, payload) {
    try {
      const rest = getRest();
      const ch = rest.channels.get(`room-${roomId}-u-${uid}`);
      console.log('[Ably] Publishing to user:', roomId, uid, event);
      await new Promise<void>((resolve, reject) => {
        ch.publish(event, payload, (err: any) => (err ? reject(err) : resolve()));
      });
    } catch (error) {
      console.error('[Ably] Failed to publish to user:', error);
      throw error;
    }
  },
  async publishToMany(roomId, uids, event, build) {
    try {
      const rest = getRest();
      console.log('[Ably] Publishing to many users:', roomId, uids.length, event);
      await Promise.all(
        uids.map((uid) => {
          const ch = rest.channels.get(`room-${roomId}-u-${uid}`);
          return new Promise<void>((resolve, reject) => {
            ch.publish(event, build(uid), (err: any) => (err ? reject(err) : resolve()));
          });
        })
      );
    } catch (error) {
      console.error('[Ably] Failed to publish to many users:', error);
      throw error;
    }
  },
};


