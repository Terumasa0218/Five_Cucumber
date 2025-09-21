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
      const ch = rest.channels.get(`room-${roomId}`);
      console.log('[Ably] Publishing to room (user-targeted payload):', roomId, uid, event);
      await new Promise<void>((resolve, reject) => {
        ch.publish(event, { ...payload, __targetUid: uid }, (err: any) => (err ? reject(err) : resolve()));
      });
    } catch (error) {
      console.error('[Ably] Failed to publish to user via room channel:', error);
      throw error;
    }
  },
  async publishToMany(roomId, uids, event, build) {
    try {
      const rest = getRest();
      const ch = rest.channels.get(`room-${roomId}`);
      console.log('[Ably] Publishing to room for many users:', roomId, uids.length, event);

      if (uids.length === 0) {
        console.log('[Ably] No users to publish to, skipping');
        return;
      }

      const messages = uids.map((uid) => ({ name: event, data: { ...build(uid), __targetUid: uid } }));
      await new Promise<void>((resolve, reject) => {
        ch.publish(messages as any, (err: any) => (err ? reject(err) : resolve()));
      });

      console.log('[Ably] Successfully published to room channel');
    } catch (error) {
      console.error('[Ably] Failed to publish to room channel:', error);
      console.warn('[Ably] Some publishes may have failed, but continuing...');
    }
  },
};


