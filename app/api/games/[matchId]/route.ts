import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    const match = await prisma.match.findUnique({
      where: { match_id: params.matchId },
      include: {
        home_team: true,
        away_team: true,
        stats: true,
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!match) {
      return NextResponse.json({ error: "MATCH_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
