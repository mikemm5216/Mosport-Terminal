import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateInternalApiKey } from "@/lib/security/validateInternalApiKey";
import { rateLimit } from "@/lib/security/rateLimit";
import { isSecurityKillSwitchEnabled } from "@/lib/security/killSwitch";

export const dynamic = 'force-dynamic';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (!rateLimit(ip, 30, 60_000)) {
    return Response.json({ error: "Too Many Requests" }, { status: 429 });
  }
  if (!validateInternalApiKey(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isSecurityKillSwitchEnabled()) {
    return Response.json({ error: "Security kill switch enabled" }, { status: 503 });
  }
  try {
    const matches = await prisma.match.findMany({
      include: { home_team: true, away_team: true }
    });

    const uniqueTeamNames = new Set<string>();
    for (const m of matches) {
      if (m.home_team && m.home_team.full_name) {
        uniqueTeamNames.add(m.home_team.full_name);
      }
      if (m.away_team && m.away_team.full_name) {
        uniqueTeamNames.add(m.away_team.full_name);
      }
    }

    const teamNames = Array.from(uniqueTeamNames);
    const results = [];

    for (const teamName of teamNames) {
      const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`;
      
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        
        let logoUrl = null;
        let shortName = (teamName || 'TM').substring(0, 3).toUpperCase();
        let leagueName = "Unknown";

        if (data.teams && data.teams.length > 0) {
          const teamDetails = data.teams[0];
          logoUrl = teamDetails.strBadge || teamDetails.strTeamBadge || null;
          if (teamDetails.strTeamShort) {
            shortName = teamDetails.strTeamShort;
          } else if (teamDetails.strAlternate) {
            shortName = (teamDetails.strAlternate as string).substring(0, 3).toUpperCase();
          }
          leagueName = teamDetails.strLeague || leagueName;
        }

        const upsertedTeam = await prisma.team.upsert({
          where: { full_name: teamName },
          create: {
            full_name: teamName,
            short_name: shortName,
            logo_url: logoUrl,
            league_type: "SOCCER" // Default or map from leagueName
          },
          update: {
            short_name: shortName,
            logo_url: logoUrl
          }
        });

        results.push(upsertedTeam);
      } catch (err: any) {
        // Silent failure for individual teams
      }

      await sleep(1500);
    }

    return NextResponse.json({ success: true, count: results.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, count: 0 });
  }
}
