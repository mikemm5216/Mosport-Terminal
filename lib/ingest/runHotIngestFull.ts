import { prisma } from "../prisma";
import { getProvider } from "../providers/sportsDataProvider";
import { normalizeProviderGame } from "./normalizeProviderGame";
import { validateGameFacts } from "./validateGameFacts";
import { buildPregameFeatureSet } from "./buildPregameFeatureSet";
import { deriveWorldState } from "../world/deriveWorldState";
import { getCoachRead } from "../coach/coachReadRouter";

/**
 * 🚀 [PRODUCTION ORCHESTRATOR] 🚀
 * V14: Production World Engine Activation
 */
export async function runHotIngestFull(params: { reason: string, date: string, provider?: string }) {
  console.log(`[IngestOrchestrator] Starting run for ${params.date} (Reason: ${params.reason})`);
  
  const providerName = params.provider || "ESPN";
  const provider = getProvider(providerName);
  const LEAGUES = ["NBA", "MLB", "NHL", "NFL", "EPL"];
  
  let totalProcessed = 0;
  const resultsByLeague: Record<string, number> = {};

  for (const leagueCode of LEAGUES) {
    console.log(`[IngestOrchestrator] Processing league: ${leagueCode}`);
    const rawGames = await provider.getPregameGames(leagueCode);
    let leagueProcessed = 0;

    for (const raw of rawGames) {
      try {
        const normalized = normalizeProviderGame(raw);
        if (!validateGameFacts(normalized)) {
          continue;
        }

        // 1. Upsert Teams
        const homeTeam = await prisma.team.upsert({
          where: { full_name: normalized.rawFeatures.homeTeamName },
          update: { sport: normalized.sport, league_name: normalized.league },
          create: { 
            full_name: normalized.rawFeatures.homeTeamName, 
            sport: normalized.sport, 
            league_name: normalized.league,
            short_name: normalized.rawFeatures.teamContext?.home?.abbreviation || normalized.homeTeamId.split('_')[1]
          }
        });

        const awayTeam = await prisma.team.upsert({
          where: { full_name: normalized.rawFeatures.awayTeamName },
          update: { sport: normalized.sport, league_name: normalized.league },
          create: { 
            full_name: normalized.rawFeatures.awayTeamName, 
            sport: normalized.sport, 
            league_name: normalized.league,
            short_name: normalized.rawFeatures.teamContext?.away?.abbreviation || normalized.awayTeamId.split('_')[1]
          }
        });

        // 2. Upsert Players (if roster exists in rawFeatures)
        if (normalized.rawFeatures.roster && Array.isArray(normalized.rawFeatures.roster)) {
          for (const p of normalized.rawFeatures.roster) {
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
          where: { match_id: normalized.matchId },
          update: {
            status: normalized.rawFeatures.status || "scheduled",
            home_score: normalized.rawFeatures.homeScore,
            away_score: normalized.rawFeatures.awayScore,
            sourceUpdatedAt: new Date()
          },
          create: {
            match_id: normalized.matchId,
            league: normalized.league,
            sport: normalized.sport,
            home_team_id: homeTeam.team_id,
            away_team_id: awayTeam.team_id,
            home_team_name: normalized.rawFeatures.homeTeamName,
            away_team_name: normalized.rawFeatures.awayTeamName,
            match_date: new Date(normalized.startTime),
            status: normalized.rawFeatures.status || "scheduled",
            home_score: normalized.rawFeatures.homeScore,
            away_score: normalized.rawFeatures.awayScore
          }
        });

        // 4. Upsert MatchStats
        await prisma.matchStats.upsert({
          where: { matchId: match.match_id },
          update: { payload: (normalized.rawFeatures || {}) as any },
          create: { matchId: match.match_id, payload: (normalized.rawFeatures || {}) as any }
        });

        // 5. Build Feature Set & Derive World State
        const features = buildPregameFeatureSet(normalized);
        const worldState = deriveWorldState(features);

        // 6. Upsert TeamWorldState (Home focus for now as per skeleton)
        await prisma.teamWorldState.upsert({
          where: { id: `${match.match_id}_ws` },
          update: {
            pressure: worldState.pressure,
            fatigue: worldState.fatigue,
            volatility: worldState.volatility,
            momentum: worldState.momentum,
            mismatch: worldState.mismatch,
            payload: worldState as any
          },
          create: {
            id: `${match.match_id}_ws`,
            teamId: homeTeam.team_id,
            pressure: worldState.pressure,
            fatigue: worldState.fatigue,
            volatility: worldState.volatility,
            momentum: worldState.momentum,
            mismatch: worldState.mismatch,
            payload: worldState as any
          }
        });

        // 7. Generate Coach Read & Persist
        const coachRead = getCoachRead(worldState);
        await prisma.matchPrediction.upsert({
          where: { id: `${normalized.matchId}_cr` },
          update: {
            label: "COACH_READ",
            action: coachRead.coachDecision,
            explanation: coachRead.coachRead,
            payload: coachRead as any
          },
          create: {
            id: `${normalized.matchId}_cr`,
            matchId: normalized.matchId,
            label: "COACH_READ",
            action: coachRead.coachDecision,
            explanation: coachRead.coachRead,
            payload: coachRead as any
          }
        });

        leagueProcessed++;
      } catch (err) {
        console.error(`[IngestOrchestrator] Error processing match:`, err);
      }
    }
    resultsByLeague[leagueCode] = leagueProcessed;
    totalProcessed += leagueProcessed;
  }

  return { 
    ok: true, 
    processed: totalProcessed, 
    resultsByLeague,
    mode: "production_world_engine", 
    engineVersion: "14.0.0",
    generatedAt: new Date().toISOString() 
  };
}
