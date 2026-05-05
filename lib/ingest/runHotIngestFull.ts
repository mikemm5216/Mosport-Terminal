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
  
  // 1. Fetch Provider Data
  const rawGames = await provider.getPregameGames("NBA"); // Example: NBA. In real usage, this loops through leagues.
  let processed = 0;

  for (const raw of rawGames) {
    try {
      const normalized = normalizeProviderGame(raw);
      if (!validateGameFacts(normalized)) {
        console.warn(`[IngestOrchestrator] Invalid game facts for ${normalized.matchId}. Skipping.`);
        continue;
      }

      // 2. Build Feature Set
      const features = buildPregameFeatureSet(normalized);

      // 3. Derive World State
      const worldState = deriveWorldState(features);

      // 4. Generate Coach Read
      const coachRead = getCoachRead(worldState);

      // 5. Persist to Database
      // Note: In production, we would first upsert teams and players as in the previous skeleton,
      // but here we focus on the Engine activation logic.
      
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

      processed++;
    } catch (err) {
      console.error(`[IngestOrchestrator] Error processing match:`, err);
    }
  }

  return { 
    ok: true, 
    processed, 
    mode: "production_world_engine", 
    engineVersion: "14.0.0",
    generatedAt: new Date().toISOString() 
  };
}
