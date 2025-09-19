export interface RealtimeAdapter {
  publishToUser(roomId: string, uid: string, event: string, payload: any): Promise<void>;
  publishToMany(roomId: string, uids: string[], event: string, build: (uid: string) => any): Promise<void>;
}


