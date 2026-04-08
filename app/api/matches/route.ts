import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';

export async function GET() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const upcoming = await db.match.findMany({
      where: {
        match_date: {
          gte: twentyFourHoursAgo, // ONLY show matches within 24 hours
        }
      },
      include: {
        home_team: true,
        away_team: true,
        signals: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      },
      orderBy: { match_date: 'desc' },
      take: 20
    });

    return NextResponse.json({
      success: true,
      upcoming: upcoming || [],
      matches: upcoming || []
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      upcoming: [],
      matches: []
    });
  }
}
