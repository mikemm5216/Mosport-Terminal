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
  allowRetroactive = false
): Promise<"created" | "exists" | "retroactive_skipped" | "error"> {
  try {
    const existing = await prisma.eventSnapshot.findUnique({
      where: { match_id_snapshot_type: { match_id: match.match_id, snapshot_type } }
    });
    if (existing) return "exists";

    const offsetMs = TYPE_TO_MS[snapshot_type];
    const snapshotTime = new Date(match.match_date.getTime() - offsetMs);

    // 批量回補時允許 retroactive；單場模式保留時間防呆
    if (!allowRetroactive && new Date() > snapshotTime) {
      return "retroactive_skipped";
    }

    const baseFakeFeatures = {
      elo_diff: 125.5,
      goal_avg_diff: 0.9,
      form_strength_home: 75.0,
      form_strength_away: 60.5,
    };

    const current_venue = match.home_team?.home_city || "Unknown";

    // 重點：使用「該場比賽的開賽時間 match.match_date」作為計算基準點
    const feature_vector = await buildFeatureVector(
      baseFakeFeatures,
      match.home_team_id,
      match.away_team_id,
      match.match_date, // ← 歷史疲勞以比賽當天為基準，非現在時間
      current_venue
    );

    await prisma.eventSnapshot.create({
      data: {
        match_id: match.match_id,
        snapshot_type,
        snapshot_time: snapshotTime,
        state_json: { _v: 1, form: { home: "W-D-W", away: "L-L-D" }, avg_goals: { home: 1.8, away: 0.9 } },
        feature_json: feature_vector,
      }
    });

    return "created";
  } catch (e: any) {
    if (e.code === 'P2002') return "exists";
    console.error(`[SNAPSHOT ERROR] match=${match.match_id} type=${snapshot_type}`, e.message);
    return "error";
  }
}

export async function POST(request: Request) {
  try {
    let body: { match_id?: string; snapshot_type?: string } = {};
    try { body = await request.json(); } catch { /* 空 body 正常，進入批量模式 */ }

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

      const result = await generateSnapshotForMatch(match, snapshot_type as SnapshotType, false);
      if (result === "retroactive_skipped") {
        return NextResponse.json({ error: "Cannot generate retroactive snapshot" }, { status: 403 });
      }
      return NextResponse.json({ success: true, result }, { status: result === "created" ? 201 : 200 });
    }

    // 批量自動掃描模式：
    // 找所有已完賽比賽，掃描全部 4 種 snapshot type，缺哪個補哪個
    const completedMatches = await prisma.matches.findMany({
      where: {
        home_score: { not: null }, // 已完賽，無時間限制
      },
      include: {
        home_team: true,
        snapshots: { select: { snapshot_type: true } } // 只拉回 type 欄位，輕量查詢
      },
      take: 100,
    });

    let created = 0;
    let skipped = 0;

    for (const match of completedMatches) {
      const existingTypes = new Set(match.snapshots.map((s: any) => s.snapshot_type));

      for (const sType of ALL_SNAPSHOT_TYPES) {
        if (existingTypes.has(sType)) {
          skipped++;
          continue;
        }
        const result = await generateSnapshotForMatch(match, sType, true); // allowRetroactive=true
        if (result === "created") created++;
        else skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      scanned_count: completedMatches.length,
      processed_count: created,
      skipped_count: skipped,
    });

  } catch (error: any) {
    console.error("Snapshot Generation Error:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      detail: error?.message || String(error)
    }, { status: 500 });
  }
}
