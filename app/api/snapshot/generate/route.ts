import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildFeatureVector } from "@/lib/feature";

const TYPE_TO_MS = {
  "T-24h": 24 * 60 * 60 * 1000,
  "T-6h": 6 * 60 * 60 * 1000,
  "T-1h": 1 * 60 * 60 * 1000,
  "T-10min": 10 * 60 * 1000,
} as const;

type SnapshotType = keyof typeof TYPE_TO_MS;
const ALL_SNAPSHOT_TYPES = Object.keys(TYPE_TO_MS) as SnapshotType[];

async function upsertSnapshotForMatch(
  match: any,
  snapshot_type: SnapshotType,
): Promise<"created" | "updated" | "error"> {
  try {
    const offsetMs = TYPE_TO_MS[snapshot_type];
    const snapshotTime = new Date(match.match_date.getTime() - offsetMs);

    const baseFakeFeatures = {
      elo_diff: 125.5,
      goal_avg_diff: 0.9,
      form_strength_home: 75.0,
      form_strength_away: 60.5,
    };

    const current_venue = match.home_team?.home_city || "Unknown";
    
    // Restoration: current_venue passed as 5th argument
    const feature_vector = await buildFeatureVector(
      baseFakeFeatures,
      match.home_team_id,
      match.away_team_id,
      match.match_date,
      current_venue
    );

    const existing = await prisma.eventSnapshot.findUnique({
      where: { match_id_snapshot_type: { match_id: match.match_id, snapshot_type } }
    });

    if (existing) {
      await prisma.eventSnapshot.update({
        where: { match_id_snapshot_type: { match_id: match.match_id, snapshot_type } },
        data: {
          snapshot_time: snapshotTime,
          state_json: { _v: 2, note: "rebuilt_bio_battery_v2" },
          feature_json: feature_vector,
        }
      });
      return "updated";
    } else {
      await prisma.eventSnapshot.create({
        data: {
          match_id: match.match_id,
          snapshot_type,
          snapshot_time: snapshotTime,
          state_json: { _v: 2, note: "rebuilt_bio_battery_v2" },
          feature_json: feature_vector,
        }
      });
      return "created";
    }
  } catch (e: any) {
    return "error";
  }
}

export async function POST(request: Request) {
  try {
    let body: { match_id?: string; snapshot_type?: string; rebuild?: boolean } = {};
    try { body = await request.json(); } catch { /* Ignore body parse error */ }

    const { match_id, snapshot_type, rebuild = false } = body;

    // Single match processing
    if (match_id) {
      if (!snapshot_type || !(snapshot_type in TYPE_TO_MS)) {
        return NextResponse.json({ error: "Missing or invalid snapshot_type" }, { status: 400 });
      }
      const match = await prisma.matches.findUnique({
        where: { match_id },
        include: { home_team: true }
      });
      if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
      const result = await upsertSnapshotForMatch(match, snapshot_type as SnapshotType);
      return NextResponse.json({ success: true, result });
    }

    const startTime = Date.now();

    // Restoration: Proper destructuring for Promise.all
    const [total_matches, matches_without_any_snapshot] = await Promise.all([
      prisma.matches.count(),
      prisma.matches.count({ where: { snapshots: { none: {} } } }),
    ]);

    const whereClause = rebuild ? {} : { snapshots: { none: {} } };

    const matches = await prisma.matches.findMany({
      where: whereClause,
      include: { home_team: true },
      take: 200,
    });

    let created = 0, updated = 0, errors = 0;

    for (const match of matches) {
      for (const sType of ALL_SNAPSHOT_TYPES) {
        const result = await upsertSnapshotForMatch(match, sType);
        if (result === "created") created++;
        else if (result === "updated") updated++;
        else errors++;
      }
    }

    return NextResponse.json({
      success: true,
      rebuild_mode: rebuild,
      diagnostic: { total_matches, matches_without_any_snapshot },
      scanned_count: matches.length,
      created_count: created,
      updated_count: updated,
      error_count: errors,
      time_elapsed_ms: Date.now() - startTime,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      rebuild_mode: false,
      scanned_count: 0,
      created_count: 0,
      updated_count: 0,
      error_count: 0,
    });
  }
}
