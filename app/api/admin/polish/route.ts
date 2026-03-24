import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // 1. Fix Logos (ESPN high-res CDN)
    await prisma.teams.updateMany({ 
      where: { short_name: 'LAD' }, 
      data: { logo_url: 'https://a.espncdn.com/i/teamlogos/mlb/500/lad.png' }
    });
    await prisma.teams.updateMany({ 
      where: { short_name: 'SDP' }, 
      data: { logo_url: 'https://a.espncdn.com/i/teamlogos/mlb/500/sd.png' }
    });
    await prisma.teams.updateMany({ 
      where: { short_name: 'BKN' }, 
      data: { logo_url: 'https://a.espncdn.com/i/teamlogos/nba/500/bkn.png' }
    });
    await prisma.teams.updateMany({ 
      where: { short_name: 'NYK' }, 
      data: { logo_url: 'https://a.espncdn.com/i/teamlogos/nba/500/ny.png' }
    });

    // 2. Feed Soccer Data (West Ham United)
    const whu = await prisma.teams.findFirst({ where: { short_name: 'WHU' } });
    if (whu) {
      // Clear old dummy history if any
      await prisma.matchHistory.deleteMany({ where: { team_id: whu.team_id } });
      // Insert fresh data
      await prisma.matchHistory.createMany({
        data: [
          { team_id: whu.team_id, result: 'W', date: new Date("2026-03-20T00:00:00Z") },
          { team_id: whu.team_id, result: 'W', date: new Date("2026-03-18T00:00:00Z") },
          { team_id: whu.team_id, result: 'D', date: new Date("2026-03-15T00:00:00Z") },
        ]
      });
    }

    return NextResponse.json({ success: true, message: "Logos updated and WHU data seeded." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
