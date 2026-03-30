import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// ─── Sport Router: prefix → ESPN endpoint + sport slug ────────────────────────
const SPORT_ROUTER: Record<string, {
    slug: string;          // used to strip the prefix
    espnSport: string;
    espnLeague: string;
    sport: string;
}> = {
    "NBA-": { slug: "NBA-", espnSport: "basketball", espnLeague: "nba", sport: "basketball" },
    "MLB-": { slug: "MLB-", espnSport: "baseball", espnLeague: "mlb", sport: "baseball" },
    "EPL-": { slug: "EPL-", espnSport: "soccer", espnLeague: "eng.1", sport: "soccer" },
    "UCL-": { slug: "UCL-", espnSport: "soccer", espnLeague: "uefa.champions", sport: "soccer" },
};

function resolveRouter(id: string) {
    for (const prefix of Object.keys(SPORT_ROUTER)) {
        if (id.startsWith(prefix)) {
            return { ...SPORT_ROUTER[prefix], espnId: id.replace(prefix, "") };
        }
    }
    // default → NBA
    return { slug: "", espnSport: "basketball", espnLeague: "nba", sport: "basketball", espnId: id };
}

// ─── Team ID normalization ─────────────────────────────────────────────────────
const ESPN_MAP: Record<string, string> = {
    NO: "NOP", GS: "GSW", NY: "NYK", SA: "SAS", WSH: "WAS", UTAH: "UTA",
};
function normalizeId(raw: string) { return ESPN_MAP[raw] ?? raw; }

// ─── Sport-aware key player extraction ────────────────────────────────────────
function extractKeyPlayer(espnData: any, teamAbbr: string, sport: string) {
    if (sport === "basketball") {
        // NBA: boxscore.players → statistics[0].athletes[0]
        const boxscore = espnData.boxscore?.players;
        const box = boxscore?.find((b: any) =>
            b.team?.abbreviation === teamAbbr || b.team?.abbreviation === ESPN_MAP[teamAbbr]
        );
        return box?.statistics?.[0]?.athletes?.[0]?.athlete ?? null;
    }

    if (sport === "soccer") {
        // Path A: rosters (common for summary)
        const rosters = espnData.rosters;
        const roster = rosters?.find((r: any) =>
            r.team?.abbreviation === teamAbbr || r.team?.abbreviation === ESPN_MAP[teamAbbr]
        );
        const starters = roster?.roster?.filter((p: any) => p.starter) ?? [];
        if (starters[0]?.athlete) return starters[0].athlete;
        if (roster?.roster?.[0]?.athlete) return roster.roster[0].athlete;

        // Path B: boxscore.players (common for specialized boxscores)
        const boxscore = espnData.boxscore?.players;
        const box = boxscore?.find((b: any) =>
            b.team?.abbreviation === teamAbbr || b.team?.abbreviation === ESPN_MAP[teamAbbr]
        );
        const athlete = box?.statistics?.[0]?.athletes?.[0]?.athlete;
        if (athlete) return athlete;

        // Path C: standings or general statistics summary
        const teamSummary = espnData.boxscore?.teams?.find((t: any) => t.team?.abbreviation === teamAbbr);
        return teamSummary?.statistics?.[0]?.athletes?.[0]?.athlete ?? null;
    }

    if (sport === "baseball") {
        // MLB: boxscore.teams → team.abbreviation → batting leaders
        const teams = espnData.boxscore?.teams;
        const team = teams?.find((t: any) =>
            t.team?.abbreviation === teamAbbr || t.team?.abbreviation === ESPN_MAP[teamAbbr]
        );
        return team?.statistics?.[0]?.athletes?.[0]?.athlete ?? null;
    }

    return null;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;

        // ── Phase 2: Dynamic sport router ──
        const route = resolveRouter(id);
        const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/${route.espnSport}/${route.espnLeague}/summary?event=${route.espnId}`;

        const espnRes = await fetch(summaryUrl, { next: { revalidate: 30 } });
        if (!espnRes.ok) throw new Error(`ESPN ${route.espnLeague} summary API failed: ${espnRes.status}`);

        const espnData = await espnRes.json();
        const event = espnData.header?.competitions?.[0];
        if (!event) throw new Error("Match Summary Invalid");

        const validTeams = await (prisma as any).teams.findMany({ select: { team_id: true } });
        const validTeamIds = new Set(validTeams.map((t: any) => t.team_id));

        const statusState = event.status?.type?.state;
        const statusMap: Record<string, string> = { pre: "SCHEDULED", in: "IN_PLAY", post: "COMPLETED" };
        const systemStatus = statusMap[statusState] || "SCHEDULED";

        const homeCompetitor = event.competitors.find((c: any) => c.homeAway === "home");
        const awayCompetitor = event.competitors.find((c: any) => c.homeAway === "away");

        const homeTeam = homeCompetitor?.team;
        const awayTeam = awayCompetitor?.team;

        const homeScore = parseInt(homeCompetitor?.score || "0", 10);
        const awayScore = parseInt(awayCompetitor?.score || "0", 10);

        const hTeamId = normalizeId(homeTeam?.abbreviation || "TBD");
        const aTeamId = normalizeId(awayTeam?.abbreviation || "TBD");

        if (!validTeamIds.has(hTeamId) || !validTeamIds.has(aTeamId)) {
            throw new Error(`Foreign Match Detected: ${hTeamId} vs ${aTeamId}`);
        }

        // @ts-ignore
        const dbMatch = await (prisma as any).match.upsert({
            where: { extId: id },
            update: { status: systemStatus, date: new Date(event.date), homeScore, awayScore },
            create: {
                extId: id,
                date: new Date(event.date),
                sport: route.sport,
                homeTeamId: hTeamId,
                awayTeamId: aTeamId,
                homeTeamName: homeTeam?.name || "Unknown",
                awayTeamName: awayTeam?.name || "Unknown",
                homeScore,
                awayScore,
                status: systemStatus,
            },
        });

        // ── FastAPI Neural Link ──
        let homeWinProb = 0.5;
        let standardAnalysis = [`INFERENCING XGBOOST [${id}]`, "ESPN CDN TRACE OBTAINED", "ALPHA ALIGNMENT: 50.0%"];
        let tacticalMatchup = ["COMPUTING SQUAD DEPTH...", "READING TRANSITION STATES...", "EDGE CALIBRATION NOMINAL"];
        let xFactors = ["TACTICAL_DEADLOCK", "MOMENTUM CONSTRAINTS APPLIED", "OUTLIER IDENTIFICATION ACTIVE"];

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const engineUrl = process.env.FASTAPI_ENGINE_URL;
            if (!engineUrl) throw new Error("FASTAPI_ENGINE_URL MISSING");


            const quantRes = await fetch(`${engineUrl}/api/v1/inference`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.FASTAPI_ENGINE_KEY || ""}` },
                body: JSON.stringify({ model_id: "latest", home_team: hTeamId, away_team: aTeamId, feature_vector: [homeScore, awayScore, 0, 0, 0, 0], model_type: "T-10min", chaos_test: false }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (quantRes.ok) {
                const pjson = await quantRes.json();
                if (typeof pjson.probability === "number" && !isNaN(pjson.probability)) homeWinProb = pjson.probability;
                if (pjson.standard_analysis) standardAnalysis = pjson.standard_analysis;
                if (pjson.tactical_matchup) tacticalMatchup = pjson.tactical_matchup;
                if (pjson.x_factors) xFactors = pjson.x_factors;
            }
        } catch (e: any) {
            homeWinProb = 0.5;
            standardAnalysis = ["[ CALCULATING ALPHA... ]", "AWAITING ENGINE RESTORE", "FALLBACK 50% EQUILIBRIUM"];
            tacticalMatchup = ["[ CALCULATING TACTICS... ]", "SYSTEM OFFLINE", "NO EDGE DETECTED"];
            xFactors = ["[ CALCULATING X-FACTORS... ]", "NEURAL LINK SEVERED", "MONITORING RESTORE"];
        }

        const awayWinProb = 1.0 - homeWinProb;

        // @ts-ignore
        await (prisma as any).matchPrediction.upsert({
            where: { matchId: dbMatch.id },
            update: { homeWinProb, awayWinProb },
            create: { matchId: dbMatch.id, homeWinProb, awayWinProb },
        });

        const validate = (val: any) =>
            val === null || val === undefined || val === "" ? "[ INTELLIGENCE PENDING ]" : val;

        // ── Phase 2: Sport-aware key player extraction ──
        const homeAthleteRaw = extractKeyPlayer(espnData, homeTeam?.abbreviation, route.sport);
        const awayAthleteRaw = extractKeyPlayer(espnData, awayTeam?.abbreviation, route.sport);

        const mapPlayer = (athlete: any) => {
            if (!athlete) return {
                player_name: "[ AWAITING BOXSCORE ]",
                jersey_number: "—",
                physical_profile: "[ CLASSIFIED PHYSICALS ]",
                season_stats: "[ CALCULATING METRICS ]",
                role: "STAR",
            };
            return {
                player_name: validate(athlete.displayName || athlete.fullName),
                jersey_number: validate(athlete.jersey),
                physical_profile: [athlete.height, athlete.weight].filter(Boolean).join(" / ") || "[ CLASSIFIED PHYSICALS ]",
                season_stats: validate(athlete.position?.abbreviation || athlete.displayValue || "LIVE TARGET"),
                role: "STAR",
            };
        };

        return NextResponse.json({
            success: true,
            data: {
                match_id: id,
                sport: route.sport,
                league: route.espnLeague,
                start_time: event.date,
                status: systemStatus,
                home_team: { short_name: hTeamId, logo_url: validate(homeTeam?.logos?.[0]?.href || homeTeam?.logo) },
                away_team: { short_name: aTeamId, logo_url: validate(awayTeam?.logos?.[0]?.href || awayTeam?.logo) },
                home_score: homeScore,
                away_score: awayScore,
                win_probabilities: { home_win_prob: homeWinProb, away_win_prob: awayWinProb },
                home_key_player: mapPlayer(homeAthleteRaw),
                away_key_player: mapPlayer(awayAthleteRaw),
                public_sentiment: {
                    narrative: `${route.espnLeague.toUpperCase()} Event Trace. Model: ${homeWinProb > 0.6 ? "ALPHA_ADVANTAGE" : "TACTICAL_DEADLOCK"}`,
                    crowd_sentiment_index: 0.5,
                },
                momentum_index: parseFloat(Math.abs(homeWinProb - 0.5).toFixed(3)),
                standard_analysis: standardAnalysis,
                tactical_matchup: tacticalMatchup,
                x_factors: xFactors,
            },
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: "CRITICAL_NODE_FAILURE", details: e.message }, { status: 500 });
    }
}
