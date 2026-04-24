import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { ENTITY_REGISTRY } from "@/src/config/entityRegistry";
import { getTeamLogo, normalizeTeamCode } from "@/src/config/teamLogos";

function getHashByCode(internalCode: string) {
    for (const [hash, entity] of Object.entries(ENTITY_REGISTRY)) {
        if (entity.internalCode === internalCode) {
            return hash;
        }
    }
    return "";
}

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
function resolveLeaguePrefix(id: string): string {
    if (id.startsWith("MLB-")) return "MLB";
    if (id.startsWith("EPL-")) return "EPL";
    if (id.startsWith("UCL-")) return "UCL";
    return "NBA";
}

// ─── Sport-aware key player extraction ────────────────────────────────────────
function extractKeyPlayer(espnData: any, teamAbbr: string, sport: string) {
    if (sport === "basketball") {
        // NBA: boxscore.players → statistics[0].athletes[0]
        const boxscore = espnData.boxscore?.players;
        const box = boxscore?.find((b: any) =>
            normalizeTeamCode("NBA", b.team?.abbreviation || "") === normalizeTeamCode("NBA", teamAbbr || "")
        );
        return box?.statistics?.[0]?.athletes?.[0]?.athlete ?? null;
    }

    if (sport === "soccer") {
        // Soccer: rosters array with team.abbreviation
        const rosters = espnData.rosters;
        const roster = rosters?.find((r: any) =>
            normalizeTeamCode("EPL", r.team?.abbreviation || "") === normalizeTeamCode("EPL", teamAbbr || "")
        );
        // Pick first starter (formation position 1)
        const starters = roster?.roster?.filter((p: any) => p.starter) ?? [];
        return starters[0]?.athlete ?? roster?.roster?.[0]?.athlete ?? null;
    }

    if (sport === "baseball") {
        // MLB: boxscore.teams → team.abbreviation → batting leaders
        const teams = espnData.boxscore?.teams;
        const team = teams?.find((t: any) =>
            normalizeTeamCode("MLB", t.team?.abbreviation || "") === normalizeTeamCode("MLB", teamAbbr || "")
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

        const statusState = event.status?.type?.state;
        const statusMap: Record<string, string> = { pre: "SCHEDULED", in: "IN_PLAY", post: "COMPLETED" };
        const systemStatus = statusMap[statusState] || "SCHEDULED";

        const homeCompetitor = event.competitors.find((c: any) => c.homeAway === "home");
        const awayCompetitor = event.competitors.find((c: any) => c.homeAway === "away");

        const homeTeam = homeCompetitor?.team;
        const awayTeam = awayCompetitor?.team;

        const homeScore = parseInt(homeCompetitor?.score || "0", 10);
        const awayScore = parseInt(awayCompetitor?.score || "0", 10);

        const leaguePrefix = resolveLeaguePrefix(id);
        const hTeamId = normalizeTeamCode(leaguePrefix, homeTeam?.abbreviation || "TBD");
        const aTeamId = normalizeTeamCode(leaguePrefix, awayTeam?.abbreviation || "TBD");

        const contexts = await (prisma as any).context.findMany({
            where: { team_code: { in: [hTeamId, aTeamId] } }
        });
        const contextMap = new Map(contexts.map((c: any) => [c.team_code, c]));

        // V2: We no longer depend on legacy Match/Prediction models.
        // We fetch the latest Quant signal from StatsLog for the home team context.
        const homeContext = contextMap.get(hTeamId) as any;
        const awayContext = contextMap.get(aTeamId) as any;

        const home_team_hash = getHashByCode(homeContext?.internal_code || hTeamId);
        const away_team_hash = getHashByCode(awayContext?.internal_code || aTeamId);

        const latestStats = await (prisma as any).statsLog.findMany({
            where: { context_internal_code: homeContext?.internal_code || hTeamId },
            orderBy: { timestamp: 'desc' },
            take: 20
        });

        const evLog = latestStats.find((s: any) => s.metric_type === 'EV');
        const winProbLog = latestStats.find((s: any) => s.metric_type === 'WIN_PROB');

        // ── FastAPI Neural Link ──
        let homeWinProb = winProbLog?.value || 0.5;
        let standardAnalysis = ["V2_ENGINE_SIGNAL_LOCKED", "CONTEXTUAL_TRACE_ACTIVE", `ALPHA_MAP: ${homeWinProb > 0.6 ? 'STRONG' : 'NEUTRAL'}`];
        let tacticalMatchup = ["READING_STATS_LOGS", "MAPPING_DOMAIN_INDICES", "QUANT_READY"];
        let xFactors = ["ENCRYPTED_ID_VAULT", "V2_ARCHITECTURE_VALIDATED"];

        const awayWinProb = 1.0 - homeWinProb;

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
                home_team: { short_name: hTeamId, logo_url: getTeamLogo(leaguePrefix, hTeamId) },
                away_team: { short_name: aTeamId, logo_url: getTeamLogo(leaguePrefix, aTeamId) },
                home_team_hash,
                away_team_hash,
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
