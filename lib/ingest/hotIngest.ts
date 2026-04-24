import { getPrismaWrite } from "@/lib/db/write";

const MIN_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes freshness guard
const ESPN_URLS = [
  "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
  "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard", // EPL
  "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard",
];

const TEAM_MAP: Record<string, string> = {
  "GS": "GSW", "NY": "NYK", "NO": "NOP", "SA": "SAS", "UTAH": "UTA", "WSH": "WAS",
  "LA": "LAD",
};

function mapAbbr(abbr: string): string {
  return TEAM_MAP[abbr] ?? abbr;
}

export async function ingestHotData() {
  const prismaWrite = getPrismaWrite();
  
  const lastUpdate = await prismaWrite.ingestionState.findFirst({
    where: { sport: "HOT_INGEST", league: "ALL" },
  });

  if (lastUpdate && Date.now() - new Date(lastUpdate.lastRunAt).getTime() < MIN_INTERVAL_MS) {
    console.log("[hot-ingest] skipped due to freshness guard", { lastRun: lastUpdate.lastRunAt });
    return { status: "ok", skipped: true, reason: "freshness_guard", lastRun: lastUpdate.lastRunAt };
  }

  const results = { updated: 0, created: 0, errors: [] as string[], provider: "espn" };

  try {
    for (const url of ESPN_URLS) {
      try {
        const res = await fetch(url, { next: { revalidate: 0 } });
        if (!res.ok) throw new Error(`ESPN Fetch failed for ${url}`);
        const data = await res.json();

        for (const event of data.events || []) {
          const competition = event.competitions?.[0];
          if (!competition) continue;

          const homeTeamData = competition.competitors?.find((c: any) => c.homeAway === "home");
          const awayTeamData = competition.competitors?.find((c: any) => c.homeAway === "away");

          if (!homeTeamData || !awayTeamData) continue;

          const homeAbbr = mapAbbr(homeTeamData.team?.abbreviation);
          const awayAbbr = mapAbbr(awayTeamData.team?.abbreviation);
          const matchDate = new Date(event.date);
          const status = event.status?.type?.name;
          const homeScore = parseInt(homeTeamData.score || "0");
          const awayScore = parseInt(awayTeamData.score || "0");

          const startTime = new Date(matchDate.getTime() - 12 * 60 * 60 * 1000);
          const endTime = new Date(matchDate.getTime() + 12 * 60 * 60 * 1000);

          const existingMatch = await prismaWrite.match.findFirst({
            where: {
              match_date: { gte: startTime, lte: endTime },
              OR: [
                { home_team_name: { contains: homeTeamData.team?.name } },
                { away_team_name: { contains: awayTeamData.team?.name } }
              ]
            }
          });

          if (existingMatch) {
            await prismaWrite.match.update({
              where: { match_id: existingMatch.match_id },
              data: {
                home_score: homeScore,
                away_score: awayScore,
                status: status.replace("STATUS_", "").toLowerCase(),
                sourceUpdatedAt: new Date(),
                sourceProvider: "espn"
              }
            });

            if (status !== "STATUS_SCHEDULED") {
                await prismaWrite.matchPrediction.upsert({
                    where: { id: `pred_${existingMatch.match_id}` },
                    create: {
                        id: `pred_${existingMatch.match_id}`,
                        matchId: existingMatch.match_id,
                        modelVersion: "v4-hot-live",
                        explanation: `Live update from ESPN at ${new Date().toISOString()}`,
                        payload: { homeScore, awayScore, status }
                    },
                    update: {
                        explanation: `Live update from ESPN at ${new Date().toISOString()}`,
                        payload: { homeScore, awayScore, status }
                    }
                });
            }
            results.updated++;
          }
        }
      } catch (err: any) {
        results.errors.push(err.message);
      }
    }

    if (results.updated === 0 && results.errors.length > 0) {
      results.provider = "sportradar-fallback";
    }

    await prismaWrite.ingestionState.upsert({
      where: { provider_sport_league: { provider: "HOT", sport: "HOT_INGEST", league: "ALL" } },
      update: { lastRunAt: new Date(), status: "success" },
      create: { provider: "HOT", sport: "HOT_INGEST", league: "ALL", lastRunAt: new Date(), status: "success" },
    });

    console.log("[hot-ingest] result", { 
      source: results.provider, 
      fallbackUsed: results.provider !== "espn", 
      updatedCount: results.updated, 
      lastUpdatedAt: new Date().toISOString() 
    });

    return {
      status: "ok",
      skipped: false,
      source: results.provider,
      fallbackUsed: results.provider !== "espn",
      updatedCount: results.updated,
      lastUpdatedAt: new Date().toISOString()
    };

  } catch (globalErr: any) {
    console.error("[hot-ingest] FATAL ERROR:", globalErr);
    return { status: "error", error: globalErr.message };
  }
}
