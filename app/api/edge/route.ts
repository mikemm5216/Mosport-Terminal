import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QuantEngine } from "@/lib/quant";

const FEATURE_ORDER = [
  "elo_diff",
  "goal_avg_diff",
  "form_strength_home",
  "form_strength_away",
  "bio_battery_home",
  "bio_battery_away",
];

// Bio-Battery 三�?层�?�?const BIO_LOW_EDGE    = 12;  // ??輕微?�勢
const BIO_MEDIUM_EDGE = 18;  // ?�⚡ 顯�??�勢
const BIO_HIGH_EDGE   = 25;  // ?�� 絕�??�勢
const PREDICT_API = process.env.PREDICT_API_URL || "http://localhost:8000/predict";

export async function GET() {
  try {
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const matches = await prisma.matches.findMany({
      where: {
        match_date: { gt: now, lt: next24h }
      },
      include: {
        home_team: true,
        away_team: true,
      },
      take: 50,
      orderBy: { match_date: "asc" }
    });

    const signals = [];

    for (const match of matches) {
      const snapshot = await prisma.eventSnapshot.findUnique({
        where: {
          match_id_snapshot_type: {
            match_id: match.match_id,
            snapshot_type: "T-10min"
          }
        }
      });

      if (!snapshot) continue;

      const featureJson = snapshot.feature_json as Record<string, any>;
      const featureVector = FEATURE_ORDER.map(f => {
        const v = featureJson?.[f];
        return typeof v === 'number' && !isNaN(v) ? v : 0;
      });

      let probability = 0;

      try {
        const res = await fetch(PREDICT_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model_id: "latest",
            feature_vector: featureVector,
            model_type: "T-10min"
          })
        });
        const data = await res.json();
        probability = data.probability;
      } catch (err) {
        continue;
      }

      if (probability <= 0) continue;

      const odds = 2.0; // TODO: ?��??�即?��???      const implied = QuantEngine.getImpliedProbability(odds);
      const edge = QuantEngine.getEdge(probability, implied);
      const kelly = QuantEngine.getKellySuggest(probability, odds);

      // Bio-Battery 警�??�斷
      const bio_battery_home = featureJson?.bio_battery_home ?? null;
      const bio_battery_away = featureJson?.bio_battery_away ?? null;
      let bio_advantage_alert: string | null = null;

      if (bio_battery_home !== null && bio_battery_away !== null) {
        const gap = bio_battery_home - bio_battery_away;
        const absGap = Math.abs(gap);
        const winner = gap > 0 ? "HOME" : "AWAY";

        if (absGap >= BIO_HIGH_EDGE) {
          bio_advantage_alert = `\uD83D\uDD25 ${winner} 絕�??�勢 (High Edge ${absGap.toFixed(1)}%)`;
        } else if (absGap >= BIO_MEDIUM_EDGE) {
          bio_advantage_alert = `?�⚡ ${winner} 顯�??�勢 (Medium Edge ${absGap.toFixed(1)}%)`;
        } else if (absGap >= BIO_LOW_EDGE) {
          bio_advantage_alert = `??${winner} 輕微?�勢 (Low Edge ${absGap.toFixed(1)}%)`;
        }
      }

      const homeName = match.home_team?.team_name || match.home_team_id;
      const awayName = match.away_team?.team_name || match.away_team_id;

      signals.push({
        match_id: match.match_id,
        match_name: `${homeName} vs ${awayName}`,
        probability,
        odds,
        implied,
        edge,
        kelly,
        bio_battery: { home: bio_battery_home, away: bio_battery_away },
        bio_advantage_alert,
        // ?��?�?> 25% ?�觸?�極高信心�?�?        confidence_boost: bio_advantage_alert !== null ? Math.min(1.0, Math.abs((bio_battery_home ?? 0) - (bio_battery_away ?? 0)) / 100) : 0,
      });
    }

    signals.sort((a, b) => b.edge - a.edge);

    return NextResponse.json({
      success: true,
      data: signals.slice(0, 20)
    });

  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}
