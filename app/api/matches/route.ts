import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';

export async function GET() {
  try {
    const upcoming = await db.matches.findMany({
      where: { status: 'scheduled' },
      include: {
        home_team: true,
        away_team: true,
        signals: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      },
      orderBy: { match_date: 'asc' },
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
      error: error.message,
      upcoming: [],
      matches: []
    }, { status: 500 });
  }
}
