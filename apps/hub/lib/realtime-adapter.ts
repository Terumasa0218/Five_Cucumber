export interface RealtimeAdapter {
  publishToUser<T extends Record<string, unknown>>(
    roomId: string,
    uid: string,
    event: string,
    payload: T
  ): Promise<void>;
  publishToMany<T extends Record<string, unknown>>(
    roomId: string,
    uids: string[],
    event: string,
    build: (uid: string) => T
  ): Promise<void>;
}


