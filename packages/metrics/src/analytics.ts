import { 
  getAnalytics, 
  logEvent, 
  Analytics,
  setUserId,
  setUserProperties 
} from 'firebase/analytics';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp,
  Firestore 
} from 'firebase/firestore';

export interface MatchData {
  gameId: string;
  players: string[];
  playerCount: number;
  duration: number;
  winnerIds: string[];
  scores: Record<string, number>;
  reason: 'completed' | 'abandoned' | 'error';
  timestamp: number;
  userId?: string;
  roomId?: string;
  difficulty?: string;
}

export interface GameSession {
  gameId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  actions: GameAction[];
  roomId?: string;
}

export interface GameAction {
  type: string;
  timestamp: number;
  data?: any;
}

export class AnalyticsManager {
  private analytics: Analytics;
  private firestore: Firestore;
  private currentSession: GameSession | null = null;

  constructor(analytics: Analytics, firestore: Firestore) {
    this.analytics = analytics;
    this.firestore = firestore;
  }

  /**
   * Set user ID for analytics
   */
  setUserId(userId: string): void {
    setUserId(this.analytics, userId);
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>): void {
    setUserProperties(this.analytics, properties);
  }

  /**
   * Record match start
   */
  async recordMatchStart(data: {
    gameId: string;
    players: string[];
    roomId?: string;
    difficulty?: string;
  }): Promise<void> {
    try {
      // Log to Firebase Analytics
      logEvent(this.analytics, 'match_start', {
        game_id: data.gameId,
        player_count: data.players.length,
        room_id: data.roomId,
        difficulty: data.difficulty
      });

      // Store in Firestore
      const matchDoc = await addDoc(collection(this.firestore, 'matches'), {
        gameId: data.gameId,
        players: data.players,
        playerCount: data.players.length,
        startTime: serverTimestamp(),
        roomId: data.roomId,
        difficulty: data.difficulty,
        status: 'active'
      });

      // Start game session
      this.currentSession = {
        gameId: data.gameId,
        userId: data.players[0], // Assuming first player is the user
        startTime: Date.now(),
        actions: [],
        roomId: data.roomId
      };

      console.log('Match start recorded:', matchDoc.id);
    } catch (error) {
      console.error('Failed to record match start:', error);
      throw error;
    }
  }

  /**
   * Record match end
   */
  async recordMatchEnd(data: MatchData): Promise<void> {
    try {
      // Log to Firebase Analytics
      logEvent(this.analytics, 'match_end', {
        game_id: data.gameId,
        player_count: data.playerCount,
        duration: data.duration,
        winner_count: data.winnerIds.length,
        reason: data.reason
      });

      // Store in Firestore
      await addDoc(collection(this.firestore, 'matches'), {
        ...data,
        timestamp: serverTimestamp()
      });

      // End current session
      if (this.currentSession) {
        this.currentSession.endTime = Date.now();
        this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
        
        await addDoc(collection(this.firestore, 'game_sessions'), {
          ...this.currentSession,
          endTime: serverTimestamp()
        });

        this.currentSession = null;
      }

      console.log('Match end recorded');
    } catch (error) {
      console.error('Failed to record match end:', error);
      throw error;
    }
  }

  /**
   * Record game action
   */
  recordAction(type: string, data?: any): void {
    try {
      // Log to Firebase Analytics
      logEvent(this.analytics, 'game_action', {
        action_type: type,
        ...data
      });

      // Add to current session
      if (this.currentSession) {
        this.currentSession.actions.push({
          type,
          timestamp: Date.now(),
          data
        });
      }

      console.log('Game action recorded:', type);
    } catch (error) {
      console.error('Failed to record game action:', error);
    }
  }

  /**
   * Record page view
   */
  recordPageView(pageName: string, pageTitle?: string): void {
    try {
      logEvent(this.analytics, 'page_view', {
        page_name: pageName,
        page_title: pageTitle
      });
    } catch (error) {
      console.error('Failed to record page view:', error);
    }
  }

  /**
   * Record custom event
   */
  recordEvent(eventName: string, parameters?: Record<string, any>): void {
    try {
      logEvent(this.analytics, eventName, parameters);
    } catch (error) {
      console.error('Failed to record event:', error);
    }
  }

  /**
   * Record error
   */
  recordError(error: Error, context?: string): void {
    try {
      logEvent(this.analytics, 'error', {
        error_message: error.message,
        error_stack: error.stack,
        context: context
      });
    } catch (analyticsError) {
      console.error('Failed to record error:', analyticsError);
    }
  }
}

/**
 * Create an analytics manager instance
 */
export function createAnalyticsManager(
  analytics: Analytics, 
  firestore: Firestore
): AnalyticsManager {
  return new AnalyticsManager(analytics, firestore);
}
