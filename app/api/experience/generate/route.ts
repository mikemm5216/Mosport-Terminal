import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FEATURE_ORDER = [
  "elo_diff",
  "goal_avg_diff",
  "form_strength_home",
  "form_strength_away",
  "fatigue_home",
  "fatigue_away",
];

function buildFeatureVector(featureJson: Record<string, number>): number[] {
  return FEATURE_ORDER.map(key => {
    const val = featureJson[key];
    return typeof val === 'number' && !isNaN(val) ? val : 0;
  });
}

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

async function processMatch(match: any): Promise<{ processed: number; results: any[] }> {
  if (match.home_score === null || match.away_score === null) return { processed: 0, results: [] };

  const label_type = "HOME_WIN";
  const label = getLabel(match, label_type);
  const results = [];

  for (const snapshot of match.snapshots) {
    const existing = await prisma.experience.findUnique({
      where: { match_id_snapshot_type: { match_id: match.match_id, snapshot_type: snapshot.snapshot_type } }
    });

    if (existing) {
      results.push({ snapshot_type: snapshot.snapshot_type, status: "skipped_existing" });
      continue;
    }

    try {
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
          feature_json: snapshot.feature_json ?? {},
          feature_vector,
          label,
          label_type,
        }
      });
      results.push({ snapshot_type: snapshot.snapshot_type, status: "created" });
    } catch (e: any) {
      if (e.code === 'P2002') {
        results.push({ snapshot_type: snapshot.snapshot_type, status: "already_exists_race" });
      } else {
        results.push({ snapshot_type: snapshot.snapshot_type, status: "error", detail: e.message });
      }
    }
  }

  return { processed: results.filter(r => r.status === "created").length, results };
}

export async function POST(request: Request) {
  try {
    let body: { match_id?: string } = {};
    try { body = await request.json(); } catch { /* ç©?body æ­?¸¸ï¼Œé€²å…¥?¹é?æ¨¡å? */ }

    const { match_id } = body;

    // ?®å ´æ¨¡å?
    if (match_id) {
      const match = await prisma.matches.findUnique({
        where: { match_id },
        include: { snapshots: true }
      });
      if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
      if (match.home_score === null || match.away_score === null) {
        return NextResponse.json({ error: "Match scores missing" }, { status: 400 });
      }
      const { processed, results } = await processMatch(match);
      return NextResponse.json({ success: true, processed_count: processed, results }, { status: 201 });
    }

    // ?¹é??ªå??ƒæ?æ¨¡å?ï¼šæ‰¾?€?‰å·²å®Œè³½ä½†å??ªç???experience ?„æ?è³?    const completedMatches = await prisma.matches.findMany({
      where: {
        home_score: { not: null },
        experiences: { none: {} }
      },
      include: { snapshots: true },
      take: 100,
    });

    let total_processed = 0;
    for (const match of completedMatches) {
      const { processed } = await processMatch(match);
      total_processed += processed;
    }

    return NextResponse.json({
      success: true,
      scanned_count: completedMatches.length,
      processed_count: total_processed,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      scanned_count: 0,
      processed_count: 0,
    });
  }
}
