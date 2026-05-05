import { prisma } from "../prisma";
import { deriveWorldState } from "../world/deriveWorldState";
import { translateWorldStateToCoachRead } from "../coach/translateWorldStateToCoachRead";
import { AnalysisPhase } from "../../types/gameStatus";

/**
 * Hardened Full Ingest Runner
 * 
 * Flow:
 * 1. Fetch raw data from providers
 * 2. Upsert Team / Player
 * 3. Upsert Match
 * 4. Upsert MatchStats
 * 5. Derive and Upsert TeamWorldState (PREGAME ONLY)
 * 6. Generate and Persist CoachRead (PREGAME ONLY)
 */
export async function runHotIngestFull(params: { reason: string, date: string }) {
  console.log(`[IngestFull] Starting run for ${params.date} (Reason: ${params.reason})`);
  
  // 1. Fetch Provider Data (Simplified for this structure)
  // In a real scenario, this would call external APIs (ESPN, TheSportsDB, etc.)
  // For now we assume we have a way to get raw game facts
  
  const matchesToProcess = await getMatchesForDate(params.date);
  let processed = 0;

  for (const rawMatch of matchesToProcess) {
    try {
      // 2. Upsert Teams
      const homeTeam = await prisma.team.upsert({
        where: { full_name: rawMatch.homeTeamName },
        update: { sport: rawMatch.sport, league_name: rawMatch.league },
        create: { 
          full_name: rawMatch.homeTeamName, 
          sport: rawMatch.sport, 
          league_name: rawMatch.league,
          short_name: rawMatch.homeTeamName.slice(0, 3).toUpperCase() 
        }
      });

      const awayTeam = await prisma.team.upsert({
        where: { full_name: rawMatch.awayTeamName },
        update: { sport: rawMatch.sport, league_name: rawMatch.league },
        create: { 
          full_name: rawMatch.awayTeamName, 
          sport: rawMatch.sport, 
          league_name: rawMatch.league,
          short_name: rawMatch.awayTeamName.slice(0, 3).toUpperCase() 
        }
      });

      // 3. Upsert Match
      const match = await prisma.match.upsert({
        where: { match_id: rawMatch.matchId },
        update: {
          status: rawMatch.status,
          home_score: rawMatch.homeScore,
          away_score: rawMatch.awayScore,
          sourceUpdatedAt: new Date()
        },
        create: {
          match_id: rawMatch.matchId,
          league: rawMatch.league,
          sport: rawMatch.sport,
          home_team_id: homeTeam.team_id,
          away_team_id: awayTeam.team_id,
          home_team_name: rawMatch.homeTeamName,
          away_team_name: rawMatch.awayTeamName,
          match_date: new Date(rawMatch.matchDate),
          status: rawMatch.status
        },
        include: {
          stats: true,
          signals: true
        }
      });

      // PREGAME-ONLY Analysis Guard
      const now = new Date();
      const isLive = match.status === "live";
      const isPast = now >= match.match_date;

      if (!isLive && !isPast) {
        // 4. Upsert MatchStats (if available in raw data)
        const stats = await prisma.matchStats.upsert({
          where: { matchId: match.match_id },
          update: { payload: (rawMatch.stats || {}) as any },
          create: { matchId: match.match_id, payload: (rawMatch.stats || {}) as any }
        });

        // 5. Derive and Upsert TeamWorldState
        const worldState = deriveWorldState(stats, match.signals);
        await prisma.teamWorldState.upsert({
          where: { id: `${match.match_id}_ws` },
          update: {
            pressure: worldState.pressure,
            fatigue: worldState.fatigue,
            volatility: worldState.volatility,
            momentum: worldState.momentum,
            mismatch: worldState.mismatch,
            payload: worldState.payload as any
          },
          create: {
            id: `${match.match_id}_ws`,
            teamId: homeTeam.team_id,
            pressure: worldState.pressure,
            fatigue: worldState.fatigue,
            volatility: worldState.volatility,
            momentum: worldState.momentum,
            mismatch: worldState.mismatch,
            payload: worldState.payload as any
          }
        });

        // 6. Generate and Persist CoachRead
        const coachReadDTO = translateWorldStateToCoachRead(worldState, {
          id: match.match_id,
          league: match.league || "UNKNOWN",
          sport: match.sport || "UNKNOWN",
          homeTeam: { id: homeTeam.team_id, name: homeTeam.full_name || "Home", shortName: homeTeam.short_name || "HOME", league: match.league || "" },
          awayTeam: { id: awayTeam.team_id, name: awayTeam.full_name || "Away", shortName: awayTeam.short_name || "AWAY", league: match.league || "" },
          match_date: match.match_date
        }, { status: "scheduled", display: "Scheduled" });

        // Hardened Persistence
        await prisma.matchPrediction.upsert({
          where: { id: `${match.match_id}_cr` },
          update: {
            label: "COACH_READ",
            action: coachReadDTO.coachDecision,
            explanation: coachReadDTO.coachRead,
            payload: {
              ...coachReadDTO,
              analysisPhase: "PREGAME_OPEN",
              generatedBeforeStart: true,
              isPregameOnly: true,
              lockedAt: null // Explicitly open
            } as any
          },
          create: {
            id: `${match.match_id}_cr`,
            matchId: match.match_id,
            label: "COACH_READ",
            action: coachReadDTO.coachDecision,
            explanation: coachReadDTO.coachRead,
            payload: {
              ...coachReadDTO,
              analysisPhase: "PREGAME_OPEN",
              generatedBeforeStart: true,
              isPregameOnly: true,
              lockedAt: null
            } as any
          }
        });

        processed++;
      } else if (isLive) {
        console.log(`[IngestFull] Match ${match.match_id} is LIVE. Skipping CoachRead refresh (Pregame Only).`);
        // We could still update scores here if we had them
      }
    } catch (err) {
      console.error(`[IngestFull] Error processing match ${rawMatch.matchId}:`, err);
    }
  }

  return { ok: true, processed, mode: "full", generatedAt: new Date().toISOString() };
}

// Mock helper to get some data for demo/worker stability
async function getMatchesForDate(date: string) {
  return [
    {
      matchId: "demo-nba-lal-gsw",
      league: "NBA",
      sport: "BASKETBALL",
      homeTeamName: "Los Angeles Lakers",
      awayTeamName: "Golden State Warriors",
      matchDate: `${date}T22:00:00Z`,
      status: "scheduled",
      stats: { paintPoints: 44, fastBreakPoints: 12 }
    }
  ];
}
