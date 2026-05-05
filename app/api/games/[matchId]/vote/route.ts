import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params;
    const body = await req.json();
    const { stance, coachAction, targetPlayer, confidence, userId } = body;

    // P0-3: userId is mandatory
    if (!userId) {
      return NextResponse.json({ 
        error: "UNAUTHORIZED", 
        message: "A valid userId is required to cast a vote." 
      }, { status: 401 });
    }

    if (!stance) {
      return NextResponse.json({ error: "STANCE_REQUIRED" }, { status: 400 });
    }

    // P0-2: Check if match is pregame
    const match = await prisma.match.findUnique({
      where: { match_id: matchId }
    });

    if (!match) {
      return NextResponse.json({ error: "MATCH_NOT_FOUND" }, { status: 404 });
    }

    // Lock voting after start
    if (match.status === "live" || match.status === "final") {
      return NextResponse.json({ 
        error: "VOTING_LOCKED_AFTER_START",
        message: "Voting is only allowed during the pregame phase."
      }, { status: 409 });
    }

    const vote = await prisma.coachDecisionVote.upsert({
      where: {
        matchId_userId: {
          matchId: matchId,
          userId: userId
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
        userId: userId,
        stance,
        coachAction,
        targetPlayer,
        confidence
      }
    });

    // Persistent User Event Log
    await prisma.userEventLog.create({
      data: {
        userId: userId,
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
