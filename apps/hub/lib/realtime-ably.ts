import Ably from 'ably/promises';
import type { RealtimeAdapter } from './realtime-adapter';

let restInstance: InstanceType<typeof Ably.Rest> | null = null;
const DEBUG_ROOMS = process.env.NEXT_PUBLIC_DEBUG_ROOMS === '1';
const debugLog = (...args: unknown[]) => {
  if (DEBUG_ROOMS) console.log(...args);
};
const debugWarn = (...args: unknown[]) => {
  if (DEBUG_ROOMS) console.warn(...args);
};

function getRest(): InstanceType<typeof Ably.Rest> {
  if (!process.env.ABLY_API_KEY) {
    throw new Error('ABLY_API_KEY environment variable is not set');
  }

  if (!restInstance) {
    debugLog('[Ably] Initializing Ably REST client');
    restInstance = new Ably.Rest(process.env.ABLY_API_KEY);
  }
  return restInstance;
}

export const ablyAdapter: RealtimeAdapter = {
  async publishToUser(roomId, uid, event, payload) {
    try {
      const rest = getRest();
      const channel = rest.channels.get(`room-${roomId}-user-${uid}`);
      debugLog('[Ably] Publishing to user channel:', roomId, uid, event);
      await channel.publish(event, payload);
    } catch (error) {
      debugWarn('[Ably] Failed to publish to user via room channel:', error);
      throw error;
    }
  },
  async publishToMany(roomId, uids, event, build) {
    try {
      const rest = getRest();
      debugLog('[Ably] Publishing to many user channels:', roomId, uids.length, event);

      if (uids.length === 0) {
        debugLog('[Ably] No users to publish to, skipping');
        return;
      }

      await Promise.all(
        uids.map((uid) => {
          const channel = rest.channels.get(`room-${roomId}-user-${uid}`);
          return channel.publish(event, build(uid));
        })
      );

      debugLog('[Ably] Successfully published to user channels');
    } catch (error) {
      debugWarn('[Ably] Failed to publish to room channel:', error);
      debugWarn('[Ably] Some publishes may have failed, but continuing...');
    }
  },
};

