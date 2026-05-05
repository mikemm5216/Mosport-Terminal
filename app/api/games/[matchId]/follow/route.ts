import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { GameFollowDTO, CoachReadDTO } from "../../../../../types/coach";

export async function GET(
  req: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params;

    const match = await prisma.match.findUnique({
      where: { match_id: matchId },
      include: {
        predictions: {
          where: { label: "COACH_READ" },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!match) {
      return NextResponse.json({ error: "MATCH_NOT_FOUND" }, { status: 404 });
    }

    const prediction = match.predictions[0];
    if (!prediction || !prediction.payload) {
      return NextResponse.json({ error: "NO_PREGAME_READ_LOCKED" }, { status: 400 });
    }

    const coachRead = prediction.payload as unknown as CoachReadDTO;

    const followDTO: GameFollowDTO = {
      matchId: match.match_id,
      analysisPhase: "LIVE_FOLLOW_ONLY",
      liveStatus: {
        status: match.status as any,
        display: match.status === "live" ? "Live" : "Final",
        // Additional status mapping would go here
      },
      score: {
        home: match.home_score || 0,
        away: match.away_score || 0
      },
      lockedCoachRead: coachRead,
      commentsEnabled: true,
      postgameVerdictPending: match.status !== "final"
    };

    return NextResponse.json(followDTO);

  } catch (error) {
    console.error("Follow API error", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
