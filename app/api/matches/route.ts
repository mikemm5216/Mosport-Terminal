import { NextResponse } from 'next/server';
import { prismaRead } from '@/lib/db/read';

export async function GET() {
  try {
    // Fetch all hot matches directly from DB without any limit/take constraint
    const matches: any[] = await prismaRead.$queryRaw`
      SELECT * FROM "Matches" 
      WHERE match_date >= NOW() - INTERVAL '24 hours'
      ORDER BY match_date DESC
    `;

    return NextResponse.json({
      success: true,
      upcoming: matches || [],
      matches: matches || []
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({
      success: false,
      upcoming: [],
      matches: []
    });
  }
}
