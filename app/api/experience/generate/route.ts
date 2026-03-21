import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FEATURE_ORDER = [
  "elo_diff",
  "goal_avg_diff",
  "form_strength_home",
  "form_strength_away"
];

function buildFeatureVector(featureJson: Record<string, number>): number[] {
  return FEATURE_ORDER.map(key => featureJson[key] ?? 0);
}

// 支援切換 Label 行為
function getLabel(match: any, type: string): number {
  switch (type) {
    case "HOME_WIN":
      return match.home_score > match.away_score ? 1 : 0;
    case "OVER_2_5":
      return (match.home_score + match.away_score) > 2.5 ? 1 : 0;
    default:
      return match.home_score > match.away_score ? 1 : 0;
  }
}

export async function POST(request: Request) {
  try {
    // 防彈防呆：body 解析失敗時回傳 400
    let body: { match_id?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { match_id } = body;

    if (!match_id) return NextResponse.json({ error: "Missing match_id" }, { status: 400 });

    const match = await prisma.matches.findUnique({
      where: { match_id },
      include: { snapshots: true }
    });

    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (match.match_date > new Date()) return NextResponse.json({ error: "Match is not finished yet" }, { status: 400 });
    if (match.home_score === null || match.away_score === null) {
      return NextResponse.json({ error: "Match scores missing (cannot compute label)" }, { status: 400 });
    }

    const label_type = "HOME_WIN";
    const label = getLabel(match, label_type);
    const results = [];

    for (const snapshot of match.snapshots) {
      // Idempotency: 寫入前防重檢查
      const existing = await prisma.experience.findUnique({
        where: {
          match_id_snapshot_type: {
            match_id: match.match_id,
            snapshot_type: snapshot.snapshot_type,
          }
        }
      });

      if (!existing) {
        try {
          // 防呆：feature_json 空值或格式不對時，回退為空物件避免 SyntaxError
          const rawFeatureJson = snapshot.feature_json;
          const safeFeatureJson: Record<string, number> =
            rawFeatureJson && typeof rawFeatureJson === 'object' && !Array.isArray(rawFeatureJson)
              ? (rawFeatureJson as Record<string, number>)
              : {};
          const feature_vector = buildFeatureVector(safeFeatureJson);

          await prisma.experience.create({
            data: {
              match_id: match.match_id,
              snapshot_type: snapshot.snapshot_type,
              feature_json: snapshot.feature_json,
              feature_vector: feature_vector,
              label: label,
              label_type: label_type,
            }
          });
          results.push({ snapshot_type: snapshot.snapshot_type, status: "created" });
        } catch (e: any) {
          if (e.code === 'P2002') {
            results.push({ snapshot_type: snapshot.snapshot_type, status: "already_exists_race" });
          } else {
            throw e;
          }
        }
      } else {
        results.push({ snapshot_type: snapshot.snapshot_type, status: "skipped_existing" });
      }
    }

    return NextResponse.json({ success: true, processed: match.snapshots.length, results }, { status: 201 });

  } catch (error: any) {
    console.error("Experience Generation Error:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      detail: error?.message || String(error)
    }, { status: 500 });
  }
}
