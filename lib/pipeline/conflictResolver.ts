import { prisma } from "@/lib/prisma";
import { CanonicalMatch, ConflictType, LeagueCode } from "./types";

const STATUS_PRIORITY: Record<string, number> = {
  closed: 3,
  live: 2,
  scheduled: 1,
  postponed: 0,
  cancelled: 0,
};

const TIME_DIFF_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

type ConflictCheck = {
  type: ConflictType;
  detected: boolean;
  resolution: string;
  resolved: CanonicalMatch;
};

function checkTime(primary: CanonicalMatch, backup: CanonicalMatch): ConflictCheck {
  const diff = Math.abs(
    new Date(primary.startsAt).getTime() - new Date(backup.startsAt).getTime(),
  );
  const detected = diff > TIME_DIFF_THRESHOLD_MS;
  return {
    type: "time",
    detected,
    resolution: detected
      ? `time diff ${diff}ms > threshold; accepted primary`
      : "within 5 min tolerance",
    resolved: detected ? primary : { ...primary, startsAt: primary.startsAt },
  };
}

function checkTeam(primary: CanonicalMatch, backup: CanonicalMatch): ConflictCheck {
  const detected =
    primary.homeTeamCode !== backup.homeTeamCode ||
    primary.awayTeamCode !== backup.awayTeamCode;
  return {
    type: "team",
    detected,
    resolution: detected ? "team mismatch flagged; accepted primary" : "teams match",
    resolved: primary,
  };
}

function checkScore(primary: CanonicalMatch, backup: CanonicalMatch): ConflictCheck {
  const detected =
    primary.homeScore !== backup.homeScore || primary.awayScore !== backup.awayScore;
  if (!detected) return { type: "score", detected, resolution: "scores match", resolved: primary };

  // Prefer the backup if it was fetched more recently (higher confidence via rawRefs length)
  const resolved =
    backup.sourceConfidence > primary.sourceConfidence ? backup : primary;
  return {
    type: "score",
    detected,
    resolution: `score mismatch; accepted ${resolved.sourceProvider} (higher confidence)`,
    resolved,
  };
}

function checkStatus(primary: CanonicalMatch, backup: CanonicalMatch): ConflictCheck {
  const detected = primary.status !== backup.status;
  if (!detected) return { type: "status", detected, resolution: "status match", resolved: primary };

  const priorityA = STATUS_PRIORITY[primary.status] ?? -1;
  const priorityB = STATUS_PRIORITY[backup.status] ?? -1;
  const resolved = priorityA >= priorityB ? primary : backup;
  return {
    type: "status",
    detected,
    resolution: `status mismatch; chose ${resolved.status} (higher priority)`,
    resolved,
  };
}

export async function resolveConflict(
  primary: CanonicalMatch,
  backup: CanonicalMatch,
): Promise<CanonicalMatch> {
  const checks = [
    checkTime(primary, backup),
    checkTeam(primary, backup),
    checkScore(primary, backup),
    checkStatus(primary, backup),
  ];

  const conflicts = checks.filter((c) => c.detected);
  if (conflicts.length === 0) return primary;

  // Last conflict resolution wins (status > score > team > time)
  const finalResolved = conflicts.reduce<CanonicalMatch>(
    (acc, c) => c.resolved,
    primary,
  );

  // Merge rawRefs from both providers
  const merged: CanonicalMatch = {
    ...finalResolved,
    rawRefs: [...new Set([...primary.rawRefs, ...backup.rawRefs])],
  };

  // Log every detected conflict
  await Promise.all(
    conflicts.map((c) =>
      prisma.dataConflictLog.create({
        data: {
          league: primary.league as LeagueCode,
          matchKey: primary.canonicalMatchId,
          primaryRawRef: primary.rawRefs[0],
          backupRawRef: backup.rawRefs[0],
          conflictType: c.type,
          resolution: c.resolution,
        },
      }),
    ),
  );

  return merged;
}
