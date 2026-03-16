import { NextResponse } from 'next/server';
import { prisma } from "../../../db/prisma";

export async function GET() {
  try {
    const signals = await prisma.signal.findMany({
      include: {
        match: {
          include: {
            home_team: true,
            away_team: true,
          }
        }
      },
      orderBy: { snr: 'desc' }, // Sort by SNR descending
      take: 50,
    });
    return NextResponse.json(signals);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
