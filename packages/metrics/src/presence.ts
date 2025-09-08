import { 
  getDatabase, 
  ref, 
  set, 
  onDisconnect, 
  onValue, 
  serverTimestamp,
  Database 
} from 'firebase/database';

export interface PresenceData {
  online: boolean;
  lastSeen: number;
  userId: string;
  userName?: string;
  gameId?: string;
  roomId?: string;
}

export interface OnlineUser {
  userId: string;
  userName?: string;
  gameId?: string;
  roomId?: string;
  lastSeen: number;
}

export class PresenceManager {
  private db: Database;
  private userId: string;
  private userName?: string;
  private presenceRef: any;
  private onlineUsersRef: any;
  private listeners: Array<() => void> = [];

  constructor(db: Database, userId: string, userName?: string) {
    this.db = db;
    this.userId = userId;
    this.userName = userName;
    this.presenceRef = ref(db, `presence/${userId}`);
    this.onlineUsersRef = ref(db, 'onlineUsers');
  }

  /**
   * Enter presence - mark user as online
   */
  async enterPresence(gameId?: string, roomId?: string): Promise<void> {
    try {
      const presenceData: PresenceData = {
        online: true,
        lastSeen: Date.now(),
        userId: this.userId,
        userName: this.userName,
        gameId,
        roomId
      };

      // Set presence data
      await set(this.presenceRef, presenceData);

      // Set up disconnect handler
      await onDisconnect(this.presenceRef).set({
        online: false,
        lastSeen: serverTimestamp(),
        userId: this.userId,
        userName: this.userName,
        gameId,
        roomId
      });

      console.log(`User ${this.userId} entered presence`);
    } catch (error) {
      console.error('Failed to enter presence:', error);
      throw error;
    }
  }

  /**
   * Exit presence - mark user as offline
   */
  async exitPresence(): Promise<void> {
    try {
      await set(this.presenceRef, {
        online: false,
        lastSeen: serverTimestamp(),
        userId: this.userId,
        userName: this.userName
      });

      console.log(`User ${this.userId} exited presence`);
    } catch (error) {
      console.error('Failed to exit presence:', error);
      throw error;
    }
  }

  /**
   * Watch online user count
   */
  watchOnlineCount(callback: (count: number) => void): () => void {
    const unsubscribe = onValue(this.onlineUsersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const onlineUsers = Object.values(data).filter(
          (user: any) => user.online === true
        ) as OnlineUser[];
        callback(onlineUsers.length);
      } else {
        callback(0);
      }
    });

    this.listeners.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Watch online users list
   */
  watchOnlineUsers(callback: (users: OnlineUser[]) => void): () => void {
    const unsubscribe = onValue(this.onlineUsersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const onlineUsers = Object.values(data).filter(
          (user: any) => user.online === true
        ) as OnlineUser[];
        callback(onlineUsers);
      } else {
        callback([]);
      }
    });

    this.listeners.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Watch users in specific game
   */
  watchGameUsers(gameId: string, callback: (users: OnlineUser[]) => void): () => void {
    const gameUsersRef = ref(this.db, `gameUsers/${gameId}`);
    
    const unsubscribe = onValue(gameUsersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const gameUsers = Object.values(data).filter(
          (user: any) => user.online === true
        ) as OnlineUser[];
        callback(gameUsers);
      } else {
        callback([]);
      }
    });

    this.listeners.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Update user's current game/room
   */
  async updateLocation(gameId?: string, roomId?: string): Promise<void> {
    try {
      await set(this.presenceRef, {
        online: true,
        lastSeen: serverTimestamp(),
        userId: this.userId,
        userName: this.userName,
        gameId,
        roomId
      });
    } catch (error) {
      console.error('Failed to update location:', error);
      throw error;
    }
  }

  /**
   * Clean up all listeners
   */
  cleanup(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];
  }
}

/**
 * Create a presence manager instance
 */
export function createPresenceManager(
  db: Database, 
  userId: string, 
  userName?: string
): PresenceManager {
  return new PresenceManager(db, userId, userName);
}
