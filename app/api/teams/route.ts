import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';

export async function GET() {
  try {
    const teams = await db.teams.findMany({
      include: {
        states: {
          orderBy: { updated_at: 'desc' },
          take: 1
        },
        league: true
      }
    });

    return NextResponse.json({ success: true, teams });
  } catch (error: any) {
    return NextResponse.json({ success: false, teams: [] });
  }
}
