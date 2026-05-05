import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { CoachReadDTO } from "../../../../types/coach";

export async function GET(
  req: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params;

    const prediction = await prisma.matchPrediction.findFirst({
      where: { 
        matchId: matchId,
        label: "COACH_READ"
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!prediction || !prediction.payload) {
      return NextResponse.json({ 
        error: "COACH_READ_NOT_FOUND",
        message: "No coach read has been generated for this match yet."
      }, { status: 404 });
    }

    const coachRead = prediction.payload as unknown as CoachReadDTO;

    // Check if game is live
    const match = await prisma.match.findUnique({
      where: { match_id: matchId }
    });

    if (match?.status === "live") {
      // In live mode, we only return the locked pregame read
      // We do not allow regeneration here
      return NextResponse.json({
        ...coachRead,
        analysisPhase: "LIVE_FOLLOW_ONLY",
        lockedAt: coachRead.lockedAt || coachRead.generatedAt
      });
    }

    return NextResponse.json(coachRead);

  } catch (error) {
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
