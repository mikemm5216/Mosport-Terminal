import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { team_name: 'asc' },
    });

    return NextResponse.json({ success: true, teams });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, teams: [] });
  }
}
