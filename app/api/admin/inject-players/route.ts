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

    const ladTeam = await prisma.team.findFirst({ where: { short_name: 'LAD' } });
    const bknTeam = await prisma.team.findFirst({ where: { short_name: 'BKN' } });

    if (!ladTeam || !bknTeam) {
      throw new Error("LAD or BKN team not found. Run Genesis injection first.");
    }

    await prisma.player.upsert({
      where: { externalId: 'P_OHTANI_GENESIS' },
      update: { fullName: "Shohei Ohtani", position: "SP/DH", teamId: ladTeam.team_id },
      create: { externalId: 'P_OHTANI_GENESIS', fullName: "Shohei Ohtani", position: "SP/DH", teamId: ladTeam.team_id },
    });

    await prisma.player.upsert({
      where: { externalId: 'P_CLAXTON_GENESIS' },
      update: { fullName: "Nic Claxton", position: "C", teamId: bknTeam.team_id },
      create: { externalId: 'P_CLAXTON_GENESIS', fullName: "Nic Claxton", position: "C", teamId: bknTeam.team_id },
    });

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      latency: `${Date.now() - startTime}ms`,
      data: { message: "Star Players (Ohtani & Claxton) Injected Successfully" }
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
