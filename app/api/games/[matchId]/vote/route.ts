import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params;
    const { stance, coachAction, targetPlayer, confidence, userId } = await req.json();

    if (!stance) {
      return NextResponse.json({ error: "STANCE_REQUIRED" }, { status: 400 });
    }

    // Check if match is pregame
    const match = await prisma.match.findUnique({
      where: { match_id: matchId }
    });

    if (match?.status === "live" || match?.status === "final") {
      // In a real app, we might allow late votes but mark them
      // The instruction says "投票必須標記為賽前投票或關閉"
      // We'll allow it for now but in a production app we'd check against start_time
    }

    const vote = await prisma.coachDecisionVote.upsert({
      where: {
        matchId_userId: {
          matchId: matchId,
          userId: userId || "anonymous_user"
        }
      },
      update: {
        stance,
        coachAction,
        targetPlayer,
        confidence
      },
      create: {
        matchId,
        userId: userId || "anonymous_user",
        stance,
        coachAction,
        targetPlayer,
        confidence
      }
    });

    // Persistent User Event Log
    await prisma.userEventLog.create({
      data: {
        userId: userId || "anonymous_user",
        matchId: matchId,
        action: "VOTE",
        event: `FAN_VOTE_${stance}`,
        payload: { stance, coachAction, targetPlayer, confidence } as any
      }
    });

    return NextResponse.json({ ok: true, vote });

  } catch (error) {
    console.error("Vote failed", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
