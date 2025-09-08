import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Firestore,
  Timestamp 
} from 'firebase/firestore';

export interface MatchRecord {
  id: string;
  gameId: string;
  players: string[];
  playerCount: number;
  duration: number;
  winnerIds: string[];
  scores: Record<string, number>;
  reason: 'completed' | 'abandoned' | 'error';
  timestamp: Timestamp;
  userId?: string;
  roomId?: string;
  difficulty?: string;
}

export interface MatchStats {
  totalMatches: number;
  totalDuration: number;
  averageDuration: number;
  winRate: number;
  mostPlayedGame: string;
  peakHours: number[];
  recentMatches: MatchRecord[];
}

export interface HourlyStats {
  hour: number;
  matchCount: number;
  averageDuration: number;
  uniquePlayers: number;
}

export class MatchManager {
  private firestore: Firestore;

  constructor(firestore: Firestore) {
    this.firestore = firestore;
  }

  /**
   * Get recent matches for a user
   */
  async getRecentMatches(
    userId: string, 
    limitCount: number = 10
  ): Promise<MatchRecord[]> {
    try {
      const matchesRef = collection(this.firestore, 'matches');
      const q = query(
        matchesRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MatchRecord[];
    } catch (error) {
      console.error('Failed to get recent matches:', error);
      throw error;
    }
  }

  /**
   * Get matches for a specific game
   */
  async getGameMatches(
    gameId: string, 
    limitCount: number = 50
  ): Promise<MatchRecord[]> {
    try {
      const matchesRef = collection(this.firestore, 'matches');
      const q = query(
        matchesRef,
        where('gameId', '==', gameId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MatchRecord[];
    } catch (error) {
      console.error('Failed to get game matches:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<MatchStats> {
    try {
      const matches = await this.getRecentMatches(userId, 100);
      
      if (matches.length === 0) {
        return {
          totalMatches: 0,
          totalDuration: 0,
          averageDuration: 0,
          winRate: 0,
          mostPlayedGame: '',
          peakHours: [],
          recentMatches: []
        };
      }

      const totalDuration = matches.reduce((sum, match) => sum + match.duration, 0);
      const averageDuration = totalDuration / matches.length;
      
      const wins = matches.filter(match => 
        match.winnerIds.includes(userId)
      ).length;
      const winRate = (wins / matches.length) * 100;

      const gameCounts = matches.reduce((counts, match) => {
        counts[match.gameId] = (counts[match.gameId] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      const mostPlayedGame = Object.entries(gameCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

      const peakHours = this.calculatePeakHours(matches);

      return {
        totalMatches: matches.length,
        totalDuration,
        averageDuration,
        winRate,
        mostPlayedGame,
        peakHours,
        recentMatches: matches.slice(0, 10)
      };
    } catch (error) {
      console.error('Failed to get user stats:', error);
      throw error;
    }
  }

  /**
   * Get hourly statistics for heatmap
   */
  async getHourlyStats(date?: Date): Promise<HourlyStats[]> {
    try {
      const targetDate = date || new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const matchesRef = collection(this.firestore, 'matches');
      const q = query(
        matchesRef,
        where('timestamp', '>=', startOfDay),
        where('timestamp', '<=', endOfDay)
      );

      const snapshot = await getDocs(q);
      const matches = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MatchRecord[];

      // Group by hour
      const hourlyData: Record<number, {
        matchCount: number;
        totalDuration: number;
        players: Set<string>;
      }> = {};

      matches.forEach(match => {
        const hour = match.timestamp.toDate().getHours();
        if (!hourlyData[hour]) {
          hourlyData[hour] = {
            matchCount: 0,
            totalDuration: 0,
            players: new Set()
          };
        }
        
        hourlyData[hour].matchCount++;
        hourlyData[hour].totalDuration += match.duration;
        match.players.forEach(player => hourlyData[hour].players.add(player));
      });

      // Convert to array
      return Array.from({ length: 24 }, (_, hour) => ({
        hour,
        matchCount: hourlyData[hour]?.matchCount || 0,
        averageDuration: hourlyData[hour] 
          ? hourlyData[hour].totalDuration / hourlyData[hour].matchCount 
          : 0,
        uniquePlayers: hourlyData[hour]?.players.size || 0
      }));
    } catch (error) {
      console.error('Failed to get hourly stats:', error);
      throw error;
    }
  }

  /**
   * Calculate peak hours from matches
   */
  private calculatePeakHours(matches: MatchRecord[]): number[] {
    const hourCounts: Record<number, number> = {};
    
    matches.forEach(match => {
      const hour = match.timestamp.toDate().getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }
}

/**
 * Create a match manager instance
 */
export function createMatchManager(firestore: Firestore): MatchManager {
  return new MatchManager(firestore);
}
