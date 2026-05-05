import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params;
    const { commentText, stance, userId, coachAction, targetPlayer, confidence } = await req.json();

    if (!userId) {
      return NextResponse.json({ 
        error: "UNAUTHORIZED", 
        message: "A valid userId is required to post a comment." 
      }, { status: 401 });
    }

    if (!commentText) {
      return NextResponse.json({ error: "COMMENT_TEXT_REQUIRED" }, { status: 400 });
    }

    const comment = await prisma.matchComment.create({
      data: {
        matchId,
        userId: userId,
        commentText,
        stance: stance || "WATCH_ONLY",
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
        action: "COMMENT",
        event: "FAN_COMMENT_POSTED",
        payload: { commentId: comment.id, stance } as any
      }
    });

    return NextResponse.json({ ok: true, comment });

  } catch (error) {
    console.error("Comment failed", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    const comments = await prisma.matchComment.findMany({
      where: { matchId: params.matchId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { displayName: true, reputation: true } } }
    });

    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
