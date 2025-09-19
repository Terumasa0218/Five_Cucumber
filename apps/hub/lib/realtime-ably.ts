import * as AblyModule from 'ably';
import type { RealtimeAdapter } from './realtime-adapter';

const Ably: any = (AblyModule as any).default ?? AblyModule;
let restInstance: any | null = null;
function getRest() {
  if (!restInstance) {
    restInstance = new Ably.Rest(process.env.ABLY_API_KEY!);
  }
  return restInstance;
}

export const ablyAdapter: RealtimeAdapter = {
  async publishToUser(roomId, uid, event, payload) {
    const rest = getRest();
    const ch = rest.channels.get(`room-${roomId}-u-${uid}`);
    await new Promise<void>((resolve, reject) => {
      ch.publish(event, payload, (err: any) => (err ? reject(err) : resolve()));
    });
  },
  async publishToMany(roomId, uids, event, build) {
    const rest = getRest();
    await Promise.all(
      uids.map((uid) => {
        const ch = rest.channels.get(`room-${roomId}-u-${uid}`);
        return new Promise<void>((resolve, reject) => {
          ch.publish(event, build(uid), (err: any) => (err ? reject(err) : resolve()));
        });
      })
    );
  },
};


