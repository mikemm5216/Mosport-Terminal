import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const TYPE_TO_MS = {
  "T-24h": 24 * 60 * 60 * 1000,
  "T-6h": 6 * 60 * 60 * 1000,
  "T-1h": 1 * 60 * 60 * 1000,
  "T-10min": 10 * 60 * 1000,
} as const;

type SnapshotType = keyof typeof TYPE_TO_MS;

import { buildFeatureVector } from "@/lib/feature";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { match_id, snapshot_type } = body as { match_id: string; snapshot_type: string };

    if (!match_id || !snapshot_type) {
      return NextResponse.json({ error: "Missing match_id or snapshot_type" }, { status: 400 });
    }

    if (!(snapshot_type in TYPE_TO_MS)) {
      return NextResponse.json({ error: "Invalid snapshot_type" }, { status: 400 });
    }

    const typedSnapshotType = snapshot_type as SnapshotType;

    // Idempotency：建立前先查詢是否存在 (複合鍵查詢)
    const existingSnapshot = await prisma.eventSnapshot.findUnique({
      where: {
        match_id_snapshot_type: {
          match_id,
          snapshot_type: typedSnapshotType,
        },
      },
    });

    if (existingSnapshot) {
      return NextResponse.json({
        success: true,
        meta: { snapshot_type: typedSnapshotType },
        data: existingSnapshot,
        message: "Snapshot already exists (Idempotent return).",
      }, { status: 200 });
    }

    // 驗證 match 是否存在
    const match = await prisma.matches.findUnique({
      where: { match_id },
      include: { home_team: true }
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // 確保時間為 UTC
    const offsetMs = TYPE_TO_MS[typedSnapshotType];
    const snapshotTime = new Date(match.match_date.getTime() - offsetMs);
    const currentTime = new Date();

    // 時間防呆：拒絕 Retroactive (事後) 的快照生成
    if (currentTime > snapshotTime) {
      return NextResponse.json(
        { error: "Cannot generate retroactive snapshot: current time has already passed the required snapshot time." },
        { status: 403 }
      );
    }

    // 寫入包含版本控制的 State
    const stateJson = {
      _v: 1,
      form: { home: "W-D-W", away: "L-L-D" },
      avg_goals: { home: 1.8, away: 0.9 },
    };

    // 使用統一萃取器構建特徵
    const baseFakeFeatures = {
      elo_diff: 125.5,
      goal_avg_diff: 0.9,
      form_strength_home: 75.0,
      form_strength_away: 60.5,
    };
    
    const current_venue = match.home_team?.home_city || "Unknown";
    const feature_vector = await buildFeatureVector(
      baseFakeFeatures,
      match.home_team_id,
      match.away_team_id,
      snapshotTime,
      current_venue
    );

    // 寫入 event_snapshots
    const newSnapshot = await prisma.eventSnapshot.create({
      data: {
        match_id,
        snapshot_type: typedSnapshotType,
        snapshot_time: snapshotTime,
        state_json: stateJson,
        feature_json: feature_vector, // DB 直接儲存嚴格 6 位 Array
      },
    });

    return NextResponse.json({
      success: true,
      meta: { snapshot_type: typedSnapshotType },
      data: newSnapshot,
    }, { status: 201 });

  } catch (error: any) {
    if (error.code === 'P2002') {
      // 強化 Idempotency：發生併發衝突(Race condition)時，攔截 P2002 並再次取得由別條 thread 寫入的結果
      const body = await request.clone().json().catch(() => ({})); 
      
      const existing = await prisma.eventSnapshot.findUnique({
        where: {
          match_id_snapshot_type: {
            match_id: body.match_id || "",
            snapshot_type: body.snapshot_type as SnapshotType,
          },
        },
      });

      return NextResponse.json({
        success: true,
        meta: { snapshot_type: body.snapshot_type },
        data: existing,
        message: "Snapshot already exists (race condition handled).",
      }, { status: 200 });
    }

    console.error("Snapshot Generation Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
