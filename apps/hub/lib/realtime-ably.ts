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
      console.log('[Ably] Publishing to many users:', roomId, uids.length, event, 'uids:', uids);

      if (uids.length === 0) {
        console.log('[Ably] No users to publish to, skipping');
        return;
      }

      await Promise.all(
        uids.map((uid) => {
          const ch = rest.channels.get(`room-${roomId}-u-${uid}`);
          console.log('[Ably] Publishing to channel:', `room-${roomId}-u-${uid}`);
          return new Promise<void>((resolve, reject) => {
            ch.publish(event, build(uid), (err: any) => {
              if (err) {
                console.error('[Ably] Failed to publish to user:', uid, 'error:', err);
                reject(err);
              } else {
                resolve();
              }
            });
          });
        })
      );

      console.log('[Ably] Successfully published to all users');
    } catch (error) {
      console.error('[Ably] Failed to publish to many users:', error);
      // 個別のパブリッシュ失敗は致命的ではないので、ログだけ出力して続行
      console.warn('[Ably] Some publishes may have failed, but continuing...');
    }
  },
};


