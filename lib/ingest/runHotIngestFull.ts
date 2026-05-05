import { prisma } from "../prisma";
import { deriveWorldState } from "../world/deriveWorldState";
import { translateWorldStateToCoachRead } from "../coach/translateWorldStateToCoachRead";

/**
 * 🚨 [SKELETON ORCHESTRATOR] 🚨
 * Keyboard Coach Pregame Engine - Hardened Ingest Pipeline Skeleton
 * 
 * IMPORTANT: This is NOT a production-ready full data provider integration.
 * It serves as the architectural foundation (Orchestrator) for:
 * 1. Coordinating multi-entity upserts (Team, Player, Match, Stats).
 * 2. Enforcing the strict pregame-only analytical lifecycle.
 * 3. Providing the schema-validated data structure for the Keyboard Coach Arena.
 * 
 * Real-world data ingestion (e.g., ESPN, Sportradar) should be plugged into 
 * the 'getMatchesForDate' and 'roster' providers.
 */
export async function runHotIngestFull(params: { reason: string, date: string }) {
  console.log(`[IngestOrchestrator] Starting run for ${params.date} (Reason: ${params.reason})`);
  
  // 1. Fetch Provider Data (Skeleton Simulation)
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

      // 2.1 Upsert Players [P1-2]
      // Simulating a roster fetch
      if (rawMatch.roster) {
        for (const p of rawMatch.roster) {
          await prisma.player.upsert({
            where: { externalId: p.externalId },
            update: { 
              fullName: p.name, 
              teamId: p.teamSide === 'home' ? homeTeam.team_id : awayTeam.team_id 
            },
            create: {
              externalId: p.externalId,
              fullName: p.name,
              teamId: p.teamSide === 'home' ? homeTeam.team_id : awayTeam.team_id,
              position: p.position
            }
          });
        }
      }

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
          status: rawMatch.status,
          home_score: rawMatch.homeScore,
          away_score: rawMatch.awayScore
        },
        include: {
          stats: true,
          signals: true,
          predictions: {
            where: { label: "COACH_READ" },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      // LifeCycle Check
      const now = new Date();
      const isLive = match.status === "live";
      const isPast = now >= match.match_date;

      if (!isLive && !isPast) {
        // 4. Upsert MatchStats
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
              lockedAt: null 
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
        // [P1-3] Handle lockedAt persistence when turning LIVE
        const latestRead = match.predictions[0];
        if (latestRead && latestRead.payload) {
          const payload = latestRead.payload as any;
          if (!payload.lockedAt) {
            console.log(`[IngestOrchestrator] Locking pregame read for match ${match.match_id} (Match is LIVE)`);
            await prisma.matchPrediction.update({
              where: { id: latestRead.id },
              data: {
                payload: {
                  ...payload,
                  analysisPhase: "LIVE_FOLLOW_ONLY",
                  lockedAt: now.toISOString()
                } as any
              }
            });
          }
        }
      }
    } catch (err) {
      console.error(`[IngestOrchestrator] Error processing match ${rawMatch.matchId}:`, err);
    }
  }

  return { ok: true, processed, mode: "orchestrator_skeleton", generatedAt: new Date().toISOString() };
}

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
      homeScore: 0,
      awayScore: 0,
      stats: { paintPoints: 44, fastBreakPoints: 12 },
      roster: [
        { externalId: "p-ad-1", name: "Anthony Davis", teamSide: "home", position: "C" },
        { externalId: "p-sc-1", name: "Steph Curry", teamSide: "away", position: "G" }
      ]
    }
  ];
}
