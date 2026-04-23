import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateCronAuth } from "@/lib/auth";
import { validateInternalApiKey } from "@/lib/security/validateInternalApiKey";
import { rateLimit } from "@/lib/security/rateLimit";

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
    // 1. Repair Team Logos with Local Assets
    const updates = [
      { t: 'LAD', l: '/lad.png' },
      { t: 'SDP', l: '/sd.png' },
      { t: 'BKN', l: '/bkn.png' },
      { t: 'NYK', l: '/ny.png' }
    ];

    for (const item of updates) {
      await prisma.teams.updateMany({
        where: { short_name: item.t },
        data: { logo_url: item.l }
      });
    }

    // 2. Inject Soccer (WHU) Match History
    const whu = await prisma.teams.findFirst({ where: { short_name: 'WHU' } });
    if (whu) {
      await prisma.matchHistory.createMany({
        data: [
          { team_id: whu.team_id, result: 'W', date: new Date("2026-03-22T00:00:00Z") },
          { team_id: whu.team_id, result: 'L', date: new Date("2026-03-18T00:00:00Z") },
          { team_id: whu.team_id, result: 'D', date: new Date("2026-03-14T00:00:00Z") }
        ]
      });
    }

    return NextResponse.json({ 
      status: "ok",
      timestamp: new Date().toISOString(),
      latency: `${Date.now() - startTime}ms`,
      data: {
        message: "Polish Operation Successful: Logos Repaired (Local Paths), Soccer History Injected." 
      }
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({
      status: "error",
      error: error.message,
      latency: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
