import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const matches = await prisma.matches.findMany({
      take: 50,
      orderBy: { match_date: 'desc' },
      include: {
        home_team: true,
        away_team: true,
        snapshots: {
          take: 1,
          orderBy: { snapshot_time: 'desc' }
        }
      }
    });

    return NextResponse.json({ success: true, count: matches.length, data: matches });
  } catch (error: any) {
    console.error("[SIGNALS API ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
