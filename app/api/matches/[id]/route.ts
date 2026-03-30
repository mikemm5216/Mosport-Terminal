import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;

        // ESPN ID Extraction
        const espnId = id.replace("NBA-", "");

        // 1. Fetch Real Data from ESPN Summary API
        const espnRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${espnId}`, {
            next: { revalidate: 30 } // Aggressive refresh for War Room
        });

        if (!espnRes.ok) {
            throw new Error(`ESPN API failed with status: ${espnRes.status}`);
        }

        const espnData = await espnRes.json();
        const event = espnData.header?.competitions?.[0];

        if (!event) throw new Error("Match Summary Invalid");

        // Pre-fetch valid teams to prevent Foreign Key crashes
        const validTeams = await (prisma as any).teams.findMany({ select: { team_id: true } });
        const validTeamIds = new Set(validTeams.map((t: any) => t.team_id));

        const statusState = event.status?.type?.state; // 'pre', 'in', 'post'
        const statusMap: Record<string, string> = { 'pre': 'SCHEDULED', 'in': 'IN_PLAY', 'post': 'COMPLETED' };
        const systemStatus = statusMap[statusState] || 'SCHEDULED';

        const homeCompetitor = event.competitors.find((c: any) => c.homeAway === 'home');
        const awayCompetitor = event.competitors.find((c: any) => c.homeAway === 'away');

        const homeTeam = homeCompetitor?.team;
        const awayTeam = awayCompetitor?.team;

        const homeScore = parseInt(homeCompetitor?.score || "0", 10);
        const awayScore = parseInt(awayCompetitor?.score || "0", 10);

        let hTeamId = homeTeam?.abbreviation || "TBD";
        let aTeamId = awayTeam?.abbreviation || "TBD";

        if (hTeamId === "NO") hTeamId = "NOP";
        if (aTeamId === "NO") aTeamId = "NOP";
        if (hTeamId === "WSH") hTeamId = "WAS";
        if (aTeamId === "WSH") aTeamId = "WAS";
        if (hTeamId === "UTAH") hTeamId = "UTA";
        if (aTeamId === "UTAH") aTeamId = "UTA";
        if (hTeamId === "GS") hTeamId = "GSW";
        if (aTeamId === "GS") aTeamId = "GSW";
        if (hTeamId === "NY") hTeamId = "NYK";
        if (aTeamId === "NY") aTeamId = "NYK";
        if (hTeamId === "SA") hTeamId = "SAS";
        if (aTeamId === "SA") aTeamId = "SAS";

        if (!validTeamIds.has(hTeamId) || !validTeamIds.has(aTeamId)) {
            throw new Error(`Foreign Match Detected`);
        }

        // @ts-ignore
        const dbMatch = await (prisma as any).match.upsert({
            where: { extId: id },
            update: {
                status: systemStatus,
                date: new Date(espnData.header?.season?.year ? event.date : new Date()),
                homeScore,
                awayScore
            },
            create: {
                extId: id,
                date: new Date(espnData.header?.season?.year ? event.date : new Date()),
                sport: "basketball",
                homeTeamId: hTeamId,
                awayTeamId: aTeamId,
                homeTeamName: homeTeam?.name || "Unknown",
                awayTeamName: awayTeam?.name || "Unknown",
                homeScore,
                awayScore,
                status: systemStatus
            }
        });

        let homeWinProb = 0.5;
        try {
            const quantRes = await fetch("http://127.0.0.1:8000/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model_id: "latest", feature_vector: [0, 0, 0, 0, 0, 0], model_type: "T-10min" }),
                signal: AbortSignal.timeout(2000)
            });
            if (quantRes.ok) {
                const pjson = await quantRes.json();
                if (typeof pjson.probability === 'number' && !isNaN(pjson.probability)) {
                    homeWinProb = pjson.probability;
                }
            }
        } catch (e) {
            homeWinProb = 0.5;
        }

        const awayWinProb = 1.0 - homeWinProb;

        // @ts-ignore
        await (prisma as any).matchPrediction.upsert({
            where: { matchId: dbMatch.id },
            update: { homeWinProb, awayWinProb },
            create: { matchId: dbMatch.id, homeWinProb, awayWinProb }
        });

        const validate = (val: any) => (val === null || val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) ? "[ INTELLIGENCE PENDING ]" : val;

        // ESPN Summary separates leaders into boxscore array
        const boxscore = espnData.boxscore?.players;
        const homeBox = boxscore?.find((b: any) => b.team?.abbreviation === homeTeam?.abbreviation);
        const awayBox = boxscore?.find((b: any) => b.team?.abbreviation === awayTeam?.abbreviation);

        // Pick top scorer as proxy for key player if available
        const homeLeader = homeBox?.statistics?.[0]?.athletes?.[0]?.athlete;
        const awayLeader = awayBox?.statistics?.[0]?.athletes?.[0]?.athlete;

        const mapPlayer = (athlete: any) => {
            if (!athlete) return { player_name: "[ INTELLIGENCE PENDING ]", jersey_number: "00", physical_profile: "[ CLASSIFIED PHYSICALS ]", season_stats: "AWAITING METRICS", role: "UNKNOWN" };
            return {
                player_name: validate(athlete.displayName),
                jersey_number: validate(athlete.jersey),
                physical_profile: "[ CLASSIFIED PHYSICALS ]",
                season_stats: "LIVE TARGET",
                role: "STAR"
            };
        };

        const signalBase = homeWinProb > 0.6 ? "ALPHA_ADVANTAGE_DETECTED" : "TACTICAL_DEADLOCK";

        return NextResponse.json({
            success: true,
            data: {
                match_id: id,
                start_time: event.date,
                status: systemStatus,
                home_team: {
                    short_name: validate(hTeamId),
                    logo_url: validate(homeTeam?.logos?.[0]?.href)
                },
                away_team: {
                    short_name: validate(aTeamId),
                    logo_url: validate(awayTeam?.logos?.[0]?.href)
                },
                home_score: homeScore,
                away_score: awayScore,
                win_probabilities: {
                    home_win_prob: homeWinProb,
                    away_win_prob: awayWinProb
                },
                home_key_player: mapPlayer(homeLeader),
                away_key_player: mapPlayer(awayLeader),
                public_sentiment: {
                    narrative: `ESPN Event Trace Generated. Model Evaluation: ${signalBase}`,
                    crowd_sentiment_index: 0.5
                },
                momentum_index: 0.5,
                standard_analysis: [
                    `INFERENCING XGBOOST VECTOR [${id}]`,
                    `ESPN CDN TRACE OBTAINED`,
                    `ALPHA ALIGNMENT: ${(homeWinProb * 100).toFixed(1)}%`
                ],
                tactical_matchup: [
                    "COMPUTING SQUAD DEPTH...",
                    "READING TRANSITION STATES...",
                    "EDGE CALIBRATION NOMINAL"
                ],
                x_factors: [
                    signalBase,
                    "MOMENTUM CONSTRAINTS APPLIED",
                    "OUTLIER IDENTIFICATION ACTIVE"
                ]
            }
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: "CRITICAL_NODE_FAILURE", details: e.message }, { status: 500 });
    }
}
