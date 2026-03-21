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

async function generateSnapshotForMatch(
  match: any,
  snapshot_type: SnapshotType,
): Promise<"created" | "exists" | "error"> {
  try {
    const existing = await prisma.eventSnapshot.findUnique({
      where: { match_id_snapshot_type: { match_id: match.match_id, snapshot_type } }
    });
    if (existing) return "exists";

    const offsetMs = TYPE_TO_MS[snapshot_type];
    const snapshotTime = new Date(match.match_date.getTime() - offsetMs);

    const baseFakeFeatures = {
      elo_diff: 125.5,
      goal_avg_diff: 0.9,
      form_strength_home: 75.0,
      form_strength_away: 60.5,
    };

    // 座標缺失時 haversineDistance 回傳 0，Bio-Battery 仍強行計算賽程密度
    const current_venue = match.home_team?.home_city || "Unknown";
    const feature_vector = await buildFeatureVector(
      baseFakeFeatures,
      match.home_team_id,
      match.away_team_id,
      match.match_date,
      current_venue
    );

    await prisma.eventSnapshot.create({
      data: {
        match_id: match.match_id,
        snapshot_type,
        snapshot_time: snapshotTime,
        state_json: { _v: 1 },
        feature_json: feature_vector,
      }
    });

    return "created";
  } catch (e: any) {
    if (e.code === 'P2002') return "exists";
    console.error(`[SNAPSHOT ERROR] match=${match.match_id} type=${snapshot_type}:`, e.message);
    return "error";
  }
}

export async function POST(request: Request) {
  try {
    let body: { match_id?: string; snapshot_type?: string } = {};
    try { body = await request.json(); } catch { /* 空 body 進入批量模式 */ }

    const { match_id, snapshot_type } = body;

    // 單場模式
    if (match_id) {
      if (!snapshot_type || !(snapshot_type in TYPE_TO_MS)) {
        return NextResponse.json({ error: "Missing or invalid snapshot_type" }, { status: 400 });
      }
      const match = await prisma.matches.findUnique({
        where: { match_id },
        include: { home_team: true }
      });
      if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
      const result = await generateSnapshotForMatch(match, snapshot_type as SnapshotType);
      return NextResponse.json({ success: true, result }, { status: result === "created" ? 201 : 200 });
    }

    // ⚡ 核平模式：只保留一個條件，通通抓出來
    const startTime = Date.now();

    const matches = await prisma.matches.findMany({
      where: {
        snapshots: { none: {} } // 唯一條件：還沒有任何快照
      },
      include: {
        home_team: true,
      },
      take: 200,
    });

    let created = 0, skipped = 0, errors = 0;

    for (const match of matches) {
      for (const sType of ALL_SNAPSHOT_TYPES) {
        const result = await generateSnapshotForMatch(match, sType);
        if (result === "created") created++;
        else if (result === "error") errors++;
        else skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      scanned_count: matches.length,
      processed_count: created,
      skipped_count: skipped,
      error_count: errors,
      time_elapsed_ms: Date.now() - startTime,
    });

  } catch (error: any) {
    console.error("Snapshot Generation Error:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      detail: error?.message || String(error)
    }, { status: 500 });
  }
}
