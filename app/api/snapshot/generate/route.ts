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

// 無座標的比賽外部設定 skip_flag，寫入 DeadLetterQueue 讓後續掃描跳過
async function markFailed(match_id: string, reason: string) {
  try {
    await prisma.deadLetterQueue.create({
      data: {
        source: "snapshot/generate",
        payload: { match_id },
        error: reason,
      }
    });
  } catch { /* 寫入 DLQ 失敗不中斷主流程 */ }
}

async function generateSnapshotForMatch(
  match: any,
  snapshot_type: SnapshotType,
  allowRetroactive = false
): Promise<"created" | "exists" | "retroactive_skipped" | "no_venue" | "error"> {
  try {
    const existing = await prisma.eventSnapshot.findUnique({
      where: { match_id_snapshot_type: { match_id: match.match_id, snapshot_type } }
    });
    if (existing) return "exists";

    const offsetMs = TYPE_TO_MS[snapshot_type];
    const snapshotTime = new Date(match.match_date.getTime() - offsetMs);

    if (!allowRetroactive && new Date() > snapshotTime) return "retroactive_skipped";

    const current_venue = match.home_team?.home_city || "Unknown";
    // venue 缺失時 haversineDistance 回傳 0，仍可計算賽程密度與 Bio-Battery
    const baseFakeFeatures = {
      elo_diff: 125.5,
      goal_avg_diff: 0.9,
      form_strength_home: 75.0,
      form_strength_away: 60.5,
    };

    // buildFeatureVector 內部會呼叫 getBioBattery → calculateBioBattery
    // 使用 match.match_date 確保歷史疲勞以「比賽當天」為基準
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

      const result = await generateSnapshotForMatch(match, snapshot_type as SnapshotType, false);
      if (result === "retroactive_skipped") {
        return NextResponse.json({ error: "Cannot generate retroactive snapshot" }, { status: 403 });
      }
      return NextResponse.json({ success: true, result }, { status: result === "created" ? 201 : 200 });
    }

    // 批量自動掃描：
    // 1. 只抓已完賽比賽
    // 2. 排除已進入 DLQ（無座標）的 match_id
    // 3. 只抓 home_team.home_city 不是 null 且不是 "Unknown" 的比賽
    const failedIds = await prisma.deadLetterQueue.findMany({
      where: { source: "snapshot/generate" },
      select: { payload: true }
    }).then(rows => rows.map((r: any) => r.payload?.match_id).filter(Boolean));

    const completedMatches = await prisma.matches.findMany({
      where: {
        home_score: { not: null }, // 只要已完賽，不限制 venue
        match_id: { notIn: failedIds.length > 0 ? failedIds : ["__none__"] },
      },
      include: {
        home_team: true,
        snapshots: { select: { snapshot_type: true } }
      },
      take: 200,
    });

    let created = 0, skipped = 0, no_venue = 0, errors = 0;

    for (const match of completedMatches) {
      const existingTypes = new Set(match.snapshots.map((s: any) => s.snapshot_type));

      for (const sType of ALL_SNAPSHOT_TYPES) {
        if (existingTypes.has(sType)) { skipped++; continue; }

        const result = await generateSnapshotForMatch(match, sType, true);
        if (result === "created") created++;
        else if (result === "error") errors++;
        else skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      scanned_count: completedMatches.length,
      processed_count: created,
      skipped_count: skipped,
      no_venue_count: no_venue,
      error_count: errors,
    });

  } catch (error: any) {
    console.error("Snapshot Generation Error:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      detail: error?.message || String(error)
    }, { status: 500 });
  }
}
