import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';

export async function GET() {
  try {
    const teams = await db.teams.findMany();
    const formattedTeams = teams.map((t: any) => ({
      ...t,
      logo_url: t.logo_url?.includes('||') ? t.logo_url.split('||')[1] : t.logo_url
    }));

    return NextResponse.json({ success: true, teams: formattedTeams });
  } catch (error: any) {
    return NextResponse.json({ success: false, teams: [] });
  }
}
