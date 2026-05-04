import { prisma } from "../prisma";

export interface HotIngestMinimalResult {
  ok: boolean;
  mode: "hot";
  reason: string;
  date: string;
  sourceProvider: string;
  fallbackUsed: boolean;
  matchesProcessed: number;
  projectionsUpdated: number;
  warnings: string[];
  generatedAt: string;
}

/**
 * Minimal Hot Ingest Runner
 * 
 * This runner bypasses the complex DataIngestionAgent pipeline to provide
 * a stable, dependency-free path for verifying the ingest-worker deployment
 * and database connectivity.
 */
export async function runHotIngestMinimal(params: {
  reason: string;
  date?: string;
}): Promise<HotIngestMinimalResult> {
  const reason = params.reason;
  const date = params.date ?? new Date().toISOString().slice(0, 10);
  const generatedAt = new Date().toISOString();
  
  let projectionsUpdated = 0;
  const warnings: string[] = [];

  try {
    const timestamp = Date.now();
    const snapshotId = `minimal-${timestamp}`;

    // Minimal LeagueProjectionSnapshot for NBA
    await prisma.leagueProjectionSnapshot.upsert({
      where: { snapshotId: snapshotId }, // This is unique, but we want to update the "latest" for the league eventually.
      // Wait, the 'where' should probably be something else if we want to replace the latest?
      // Actually, snapshotId is unique, so this will always 'create'.
      // If we want to replace a specific league's latest, we'd need a unique constraint on [league, isLatest] or similar.
      // Since schema doesn't have that, we'll just create a new one.
      update: {
        generatedAt: new Date(),
        dataCutoff: new Date(),
        dataStatus: "MINIMAL_INGEST_READY",
        payload: {
          source: "minimal-hot-ingest",
          reason,
          date,
          note: "Full DataIngestionAgent disabled due to build constraints."
        }
      },
      create: {
        league: "NBA",
        snapshotId: snapshotId,
        generatedAt: new Date(),
        dataCutoff: new Date(),
        modelVersion: "v12-minimal",
        dataStatus: "MINIMAL_INGEST_READY",
        sourceProvider: "minimal",
        projectedChampion: { team: { name: "TBD" }, probability: 0 },
        titleDistribution: [],
        warnings: ["MATCH_INGESTION_MINIMAL_MODE"],
        refreshReason: reason,
        payload: {
          source: "minimal-hot-ingest",
          reason,
          date,
          note: "Full DataIngestionAgent disabled due to build constraints."
        }
      }
    });

    projectionsUpdated = 1;
  } catch (error: any) {
    console.error("[runHotIngestMinimal] Projection update failed", error);
    warnings.push(`PROJECTION_SNAPSHOT_UPDATE_FAILED: ${error.message}`);
  }

  return {
    ok: projectionsUpdated > 0,
    mode: "hot",
    reason,
    date,
    sourceProvider: "minimal",
    fallbackUsed: false,
    matchesProcessed: 0,
    projectionsUpdated,
    warnings: [
      ...warnings,
      "MATCH_INGESTION_MINIMAL_MODE: Full pipeline dependencies not wired in root app."
    ],
    generatedAt
  };
}
