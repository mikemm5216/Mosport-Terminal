import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    const past12h = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const future12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    const matches = await prisma.matches.findMany({
      where: {
        match_date: {
          gte: past12h,
          lte: future12h,
        },
      },
      include: {
        home_team: true,
        away_team: true,
      },
      orderBy: {
        match_date: 'asc',
      },
    });

    return NextResponse.json({ success: true, matches: matches || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, matches: [] });
  }
}
