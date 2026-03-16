import { NextResponse } from 'next/server';
import { prisma } from "../../../../db/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // In Next.js 15, route segment configs are async
) {
  try {
    const { id } = await params;
    
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        home_team: { include: { states: true } },
        away_team: { include: { states: true } },
        signals: true,
        stats: true,
        odds: true,
        quant: true,
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json(match);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
