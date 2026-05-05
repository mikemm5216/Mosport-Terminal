import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function POST(req: Request) {
  try {
    const { 
      matchId, 
      userId, 
      reportType, 
      description, 
      entityType, 
      entityId, 
      teamCode, 
      playerName, 
      currentValue, 
      suggestedValue 
    } = await req.json();

    if (!reportType || !description) {
      return NextResponse.json({ error: "REPORT_TYPE_AND_DESCRIPTION_REQUIRED" }, { status: 400 });
    }

    const report = await prisma.dataChallengeReport.create({
      data: {
        matchId,
        userId: userId || "anonymous_user",
        reportType,
        description,
        entityType: entityType || "OTHER",
        entityId,
        teamCode,
        playerName,
        currentValue,
        suggestedValue,
        status: "OPEN",
        priority: "NORMAL"
      }
    });

    // Log the challenge event
    await prisma.userEventLog.create({
      data: {
        userId: userId || "anonymous_user",
        matchId: matchId,
        action: "DATA_CHALLENGE",
        event: `REPORT_${reportType}`,
        payload: { reportId: report.id } as any
      }
    });

    return NextResponse.json({ ok: true, report });

  } catch (error) {
    console.error("Data challenge failed", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
