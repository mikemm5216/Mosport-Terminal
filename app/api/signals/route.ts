import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';

export async function GET() {
  try {
    const signals = await db.signals.findMany({
      where: { signal_type: 'true_signal' },
      orderBy: { snr: 'desc' },
      include: {
        match: {
          include: {
            home_team: true,
            away_team: true
          }
        }
      },
      take: 50
    });

    return NextResponse.json({ success: true, signals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
