import { db } from "../lib/db";
import { runQuantSimulations } from "./quantEngine";
import { generateSignals } from "./alphaEngine";

/**
 * Pre-Match Snapshot Engine (T-10m)
 * Called independently to seal the final metrics before kickoff.
 */
export async function createPreMatchSnapshots() {
  console.log("[Snapshot Engine] Creating T-10m final signal snapshots...");

  // In a real system, you'd find matches where match_date is between now and +10 mins.
  // Here we mock finding those immediate upcoming matches.
  const imminentMatches = await db.matches.findMany({
    where: { 
      status: 'scheduled',
      final_signal_snapshot: { equals: null }
      // match_date: { lte: new Date(Date.now() + 10 * 60 * 1000) }
    },
    include: {
       signals: { orderBy: { created_at: 'desc' }, take: 1 }
    }
  });

  for (const match of imminentMatches) {
     const latestSignal = match.signals[0];
     if (latestSignal) {
        await db.matches.update({
          where: { match_id: match.match_id },
          data: {
             final_signal_snapshot: {
                model_probability_home: latestSignal.model_probability_home,
                market_probability_home: latestSignal.market_probability_home,
                edge: latestSignal.edge,
                snr: latestSignal.snr,
                timestamp: new Date().toISOString()
             }
          }
        });
        console.log(`[Snapshot Engine] Sealed Match ${match.match_id} metrics as final snapshot.`);
     }
  }
}

/**
 * Archival Engine (Cold Data)
 * Moves matches older than 30 days to the History tables.
 */
export async function archiveColdData() {
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  console.log(`[Archival Engine] Archiving data older than ${cutoffDate.toISOString()}...`);

  // Move finished matches 
  const coldMatches = await db.matches.findMany({
    where: {
       status: 'finished',
       match_date: { lt: cutoffDate }
    },
    include: {
       stats: true,
       signals: true
    }
  });

  for (const match of coldMatches) {
     if (!match.stats) continue;

     // 1. Move to MatchesHistory
     await db.matchesHistory.create({
        data: {
           original_match_id: match.match_id,
           league_id: match.league_id,
           home_team_id: match.home_team_id,
           away_team_id: match.away_team_id,
           match_date: match.match_date,
           final_home_score: match.stats.home_score,
           final_away_score: match.stats.away_score,
           final_signal_snapshot: match.final_signal_snapshot
        }
     });

     // 2. Move associated Signals to SignalsHistory
     for (const sig of match.signals) {
        await db.signalsHistory.create({
           data: {
              original_signal_id: sig.id,
              match_id: match.match_id,
              model_probability_home: sig.model_probability_home,
              market_probability_home: sig.market_probability_home,
              edge: sig.edge,
              snr: sig.snr,
              signal_type: sig.signal_type,
              created_at: sig.created_at
           }
        });
     }

     // 3. Delete from Hot tables
     await db.signals.deleteMany({ where: { match_id: match.match_id } });
     await db.matchStats.delete({ where: { match_id: match.match_id } });
     await db.matches.delete({ where: { match_id: match.match_id } });
     
     console.log(`[Archival] Archived Match ${match.match_id} safely.`);
  }
}
