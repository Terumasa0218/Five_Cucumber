import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

/**
 * Aggregate match statistics hourly
 */
export const aggregateHourlyStats = functions.pubsub
  .schedule('0 * * * *') // Every hour
  .onRun(async (context) => {
    const now = new Date();
    const hour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const hourKey = hour.toISOString().slice(0, 13).replace(/[-T]/g, '');

    try {
      // Get matches from the last hour
      const startTime = new Date(hour.getTime());
      const endTime = new Date(hour.getTime() + 60 * 60 * 1000);

      const matchesSnapshot = await db
        .collection('matches')
        .where('timestamp', '>=', startTime)
        .where('timestamp', '<', endTime)
        .get();

      const matches = matchesSnapshot.docs.map(doc => doc.data());
      
      // Calculate statistics
      const stats: any = {
        hour: hourKey,
        totalMatches: matches.length,
        totalDuration: matches.reduce((sum, match) => sum + (match.duration || 0), 0),
        averageDuration: 0,
        uniquePlayers: new Set<string>(),
        gameStats: {} as Record<string, any>
      };

      if (matches.length > 0) {
        stats.averageDuration = stats.totalDuration / matches.length;
        
        // Count unique players
        matches.forEach(match => {
          if (match.players) {
            match.players.forEach((player: string) => stats.uniquePlayers.add(player));
          }
        });

        // Game-specific stats
        matches.forEach(match => {
          const gameId = match.gameId || 'unknown';
          if (!stats.gameStats[gameId]) {
            stats.gameStats[gameId] = {
              count: 0,
              totalDuration: 0,
              players: new Set<string>()
            };
          }
          
          stats.gameStats[gameId].count++;
          stats.gameStats[gameId].totalDuration += match.duration || 0;
          
          if (match.players) {
            match.players.forEach((player: string) => 
              stats.gameStats[gameId].players.add(player)
            );
          }
        });

        // Convert Sets to counts
        stats.uniquePlayers = stats.uniquePlayers.size;
        Object.keys(stats.gameStats).forEach(gameId => {
          const gameStat = stats.gameStats[gameId] as any;
          gameStat.uniquePlayers = gameStat.players.size;
          delete gameStat.players;
        });
      }

      // Save aggregated stats
      await db.collection('metrics').doc('hourly').collection('stats').doc(hourKey).set(stats);
      
      console.log(`Aggregated stats for ${hourKey}:`, stats);
      
    } catch (error) {
      console.error('Error aggregating hourly stats:', error);
    }
  });

/**
 * Clean up old match data
 */
export const cleanupOldMatches = functions.pubsub
  .schedule('0 2 * * *') // Daily at 2 AM
  .onRun(async (context) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const oldMatchesSnapshot = await db
        .collection('matches')
        .where('timestamp', '<', thirtyDaysAgo)
        .limit(500) // Process in batches
        .get();

      const batch = db.batch();
      oldMatchesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      
      console.log(`Cleaned up ${oldMatchesSnapshot.docs.length} old matches`);
      
    } catch (error) {
      console.error('Error cleaning up old matches:', error);
    }
  });

/**
 * Update user statistics
 */
export const updateUserStats = functions.firestore
  .document('matches/{matchId}')
  .onCreate(async (snap, context) => {
    const match = snap.data();
    
    if (!match.players || !Array.isArray(match.players)) {
      return;
    }

    try {
      const batch = db.batch();
      
      for (const playerId of match.players) {
        const userStatsRef = db.collection('userStats').doc(playerId);
        
        // Get current stats
        const userStatsDoc = await userStatsRef.get();
        const currentStats = userStatsDoc.exists ? userStatsDoc.data() : {
          totalMatches: 0,
          totalWins: 0,
          totalDuration: 0,
          lastPlayed: null
        };

        // Update stats
        const isWinner = match.winnerIds && match.winnerIds.includes(playerId);
        const newStats = {
          totalMatches: (currentStats?.totalMatches || 0) + 1,
          totalWins: (currentStats?.totalWins || 0) + (isWinner ? 1 : 0),
          totalDuration: (currentStats?.totalDuration || 0) + (match.duration || 0),
          lastPlayed: match.timestamp,
          winRate: 0 // Will be calculated
        };

        // Calculate win rate
        newStats.winRate = newStats.totalWins / newStats.totalMatches;

        batch.set(userStatsRef, newStats);
      }

      await batch.commit();
      console.log(`Updated stats for ${match.players.length} players`);
      
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  });

/**
 * HTTP function to get aggregated stats
 */
export const getStats = functions.https.onRequest(async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = db.collection('metrics').doc('hourly').collection('stats') as any;
    
    if (startDate) {
      query = query.where('hour', '>=', startDate);
    }
    
    if (endDate) {
      query = query.where('hour', '<=', endDate);
    }
    
    const snapshot = await query.orderBy('hour').get();
    const stats = snapshot.docs.map((doc: any) => doc.data());
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
