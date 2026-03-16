import { NextResponse } from 'next/server';
import { prisma } from "../../../db/prisma";

export async function GET() {
  try {
    const matches = await prisma.match.findMany({
      include: {
        home_team: true,
        away_team: true,
        signals: true,
        stats: true,
      },
      orderBy: { match_date: 'desc' },
      take: 50,
    });
    return NextResponse.json(matches);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
