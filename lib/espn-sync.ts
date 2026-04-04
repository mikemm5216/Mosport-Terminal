import { prisma } from "@/lib/prisma";
import { getXGBoostInference } from "./inference";

function norm(raw: string, league: string) {
    if (raw === "NY") return league === "NBA" ? "NYK" : "NYY";
    const map: Record<string, string> = {
        NO: "NOP", GS: "GSW", SA: "SAS", WSH: "WAS", UTAH: "UTA", PHX: "PHX", CLE: "CLE", KC: "KC"
    };
    return map[raw] || raw;
}

export async function syncLeagues(daysOffset: number = 0) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysOffset);
    const dateStr = targetDate.toISOString().split('T')[0].replace(/-/g, '');

    const LEAGUES = [
        { sport: "basketball", league: "nba", prefix: "NBA", url: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard" },
        { sport: "baseball", league: "mlb", prefix: "MLB", url: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard" },
        { sport: "soccer", league: "epl", prefix: "EPL", url: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard" },
        { sport: "soccer", league: "ucl", prefix: "UCL", url: "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard" },
    ];

    const validTeams = await (prisma as any).teams.findMany({ select: { team_id: true } });
    const validTeamIds = new Set<string>(validTeams.map((t: any) => t.team_id));

    for (const league of LEAGUES) {
        try {
            const url = `${league.url}?dates=${dateStr}`;
            const res = await fetch(url, { next: { revalidate: 0 } });
            if (!res.ok) continue;
            const data = await res.json();

            for (const event of (data.events || [])) {
                const matchId = `${league.prefix}-${event.id}`;
                const statusMap: Record<string, string> = { pre: "SCHEDULED", in: "IN_PLAY", post: "COMPLETED" };
                const systemStatus = statusMap[event.status?.type?.state] || "SCHEDULED";

                const comp = event.competitions?.[0];
                const hComp = comp?.competitors?.find((c: any) => c.homeAway === "home");
                const aComp = comp?.competitors?.find((c: any) => c.homeAway === "away");

                const hRaw = norm(hComp?.team?.abbreviation, league.prefix);
                const aRaw = norm(aComp?.team?.abbreviation, league.prefix);
                const hTeamId = `${league.prefix}_${hRaw}`;
                const aTeamId = `${league.prefix}_${aRaw}`;

                if (!validTeamIds.has(hTeamId) || !validTeamIds.has(aTeamId)) continue;

                // ── Patch 17.21 Shadow Bridge ──
                const espnProb = hComp?.winProbability ? parseFloat(hComp.winProbability) / 100 :
                    (comp.odds?.[0]?.homeWinProbability ? parseFloat(comp.odds[0].homeWinProbability) / 100 :
                        (comp.predictor?.homeTeam?.winProbability ? parseFloat(comp.predictor.homeTeam.winProbability) / 100 : undefined));
                const predictedHomeWinRate = await getXGBoostInference(hTeamId, aTeamId, league.sport, espnProb);

                await (prisma as any).match.upsert({
                    where: { extId: matchId },
                    update: {
                        status: systemStatus,
                        date: new Date(event.date),
                        homeScore: parseInt(hComp?.score || "0"),
                        awayScore: parseInt(aComp?.score || "0"),
                        predictedHomeWinRate: predictedHomeWinRate !== -1.0 ? predictedHomeWinRate : undefined
                    },
                    create: {
                        extId: matchId,
                        date: new Date(event.date),
                        sport: league.sport,
                        homeTeamId: hTeamId,
                        awayTeamId: aTeamId,
                        homeTeamName: hComp?.team?.name || "Unknown",
                        awayTeamName: aComp?.team?.name || "Unknown",
                        homeScore: parseInt(hComp?.score || "0"),
                        awayScore: parseInt(aComp?.score || "0"),
                        status: systemStatus,
                        predictedHomeWinRate: predictedHomeWinRate !== -1.0 ? predictedHomeWinRate : undefined
                    }
                });
            }
        } catch (e) {
            console.error(`Sync failed for ${league.prefix}:`, e);
        }
    }
}
