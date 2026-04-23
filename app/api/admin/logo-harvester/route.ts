import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateCronAuth } from "@/lib/auth";
import { validateInternalApiKey } from "@/lib/security/validateInternalApiKey";
import { rateLimit } from "@/lib/security/rateLimit";
import fs from "fs";
import path from "path";

/**
 * PHASE 3: Logo Harvester & "Cold Data" Persistence
 * Plan A: ESPN CDN
 * Plan B: Wikimedia API Search
 * Plan C: Dynamic SVG Placeholder
 */
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  if (!rateLimit(ip, 30, 60_000)) {
    return Response.json({ error: "Too Many Requests" }, { status: 429 });
  }
  if (!validateInternalApiKey(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const startTime = Date.now();
  try {
    const error = await validateCronAuth(request.clone());
    if (error) return error;

    const teams = await prisma.teams.findMany();
    const results = [];

    const publicLogosDir = path.join(process.cwd(), "public", "logos");
    if (!fs.existsSync(publicLogosDir)) {
      fs.mkdirSync(publicLogosDir, { recursive: true });
    }

    for (const team of teams) {
      const shortName = (team.short_name || "").toLowerCase();
      const league = (team.league_type || "mlb").toLowerCase();
      const fileName = `${shortName}.png`;
      const localPath = `/logos/${fileName}`;
      const fullLocalPath = path.join(publicLogosDir, fileName);

      let success = false;
      let source = "";

      // Plan A: ESPN
      const espnUrl = `https://a.espncdn.com/i/teamlogos/${league}/500/${shortName}.png`;
      try {
        const resp = await fetch(espnUrl);
        if (resp.ok) {
          const buffer = await resp.arrayBuffer();
          fs.writeFileSync(fullLocalPath, Buffer.from(buffer));
          success = true;
          source = "ESPN";
        }
      } catch (e) {}

      // Plan B: Wikimedia (Simple Search)
      if (!success) {
        try {
          const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&titles=${encodeURIComponent(team.full_name + " logo")}&pithumbsize=500`;
          const wikiResp = await fetch(wikiSearchUrl);
          const wikiData = await wikiResp.json();
          const pages = wikiData.query.pages;
          const pageId = Object.keys(pages)[0];
          const thumbUrl = pages[pageId]?.thumbnail?.source;

          if (thumbUrl) {
            const imgResp = await fetch(thumbUrl);
            const buffer = await imgResp.arrayBuffer();
            fs.writeFileSync(fullLocalPath, Buffer.from(buffer));
            success = true;
            source = "Wikimedia";
          }
        } catch (e) {}
      }

      // Plan C: SVG Generator (Fallback)
      if (!success) {
        const svg = generateSVG(team.short_name || "??", team.league_type);
        fs.writeFileSync(fullLocalPath.replace(".png", ".svg"), svg);
        source = "SVG_GENERATOR";
      }

      // Update DB
      await prisma.teams.update({
        where: { team_id: team.team_id },
        data: { logo_url: success ? localPath : localPath.replace(".png", ".svg") }
      });

      results.push({ team: team.short_name, source, success });
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      latency: `${Date.now() - startTime}ms`,
      data: {
        message: "Logo Harvesting Completed. Run 'git add public/logos && git commit -m \"chore: update cold data logos\"' to persist.",
        results
      }
    });

  } catch (err: any) {
    return NextResponse.json({
      status: "error",
      error: err.message,
      latency: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function generateSVG(initials: string, league: string) {
  const bgColor = league === "MLB" ? "#002D72" : league === "NBA" ? "#1D428A" : "#670E36";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
    <rect width="500" height="500" fill="${bgColor}"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="200" font-weight="900" fill="white">${initials}</text>
  </svg>`;
}
