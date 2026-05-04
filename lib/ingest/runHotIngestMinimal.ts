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
  const now = new Date();
  const generatedAt = now.toISOString();
  
  let projectionsUpdated = 0;
  const warnings: string[] = [];

  try {
    const snapshotId = `latest_nba`;

    const projectedChampion = {
      team: {
        id: "NBA-TBD",
        code: "TBD",
        canonicalKey: "NBA_TBD",
        displayName: "TBD",
        shortName: "TBD",
        logoUrl: null,
        seed: null,
        record: null
      },
      titleProbability: 0
    };

    const titleDistribution: any[] = [];

    const bracketState = {
      status: "MINIMAL_INGEST_READY",
      source: "minimal-hot-ingest",
      reason,
      date,
      note: "Full DataIngestionAgent disabled until dependencies are consolidated"
    };

    // Minimal LeagueProjectionSnapshot for NBA
    await prisma.leagueProjectionSnapshot.upsert({
      where: { snapshotId: snapshotId },
      update: {
        generatedAt: now,
        dataCutoff: now,
        modelVersion: "minimal-hot-ingest-v1",
        dataStatus: "DEGRADED",
        sourceProvider: "minimal",
        projectedChampion,
        titleDistribution,
        finalsMatchup: null,
        bracketState,
        warnings: ["MATCH_INGESTION_MINIMAL_MODE"],
        refreshReason: reason
      },
      create: {
        league: "NBA",
        snapshotId: snapshotId,
        generatedAt: now,
        dataCutoff: now,
        modelVersion: "minimal-hot-ingest-v1",
        dataStatus: "DEGRADED",
        sourceProvider: "minimal",
        projectedChampion,
        titleDistribution,
        finalsMatchup: null,
        bracketState,
        warnings: ["MATCH_INGESTION_MINIMAL_MODE"],
        refreshReason: reason
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
