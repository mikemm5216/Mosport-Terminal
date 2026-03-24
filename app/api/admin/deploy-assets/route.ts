import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function POST() {
  try {
    const assets = [
      { name: 'lad.png', url: 'https://a.espncdn.com/i/teamlogos/mlb/500/lad.png' },
      { name: 'sd.png', url: 'https://a.espncdn.com/i/teamlogos/mlb/500/sd.png' },
      { name: 'bkn.png', url: 'https://a.espncdn.com/i/teamlogos/nba/500/bkn.png' },
      { name: 'ny.png', url: 'https://a.espncdn.com/i/teamlogos/nba/500/ny.png' }
    ];

    const results = [];
    const publicDir = path.join(process.cwd(), 'public');
    
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    for (const asset of assets) {
      const res = await fetch(asset.url);
      if (!res.ok) throw new Error(`Failed to fetch ${asset.name}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const filePath = path.join(publicDir, asset.name);
      fs.writeFileSync(filePath, buffer);
      results.push({ name: asset.name, size: buffer.length });
    }

    // ALIGN DATABASE
    await prisma.teams.updateMany({ where: { short_name: 'LAD' }, data: { logo_url: '/lad.png' } });
    await prisma.teams.updateMany({ where: { short_name: 'SDP' }, data: { logo_url: '/sd.png' } });
    await prisma.teams.updateMany({ where: { short_name: 'BKN' }, data: { logo_url: '/bkn.png' } });
    await prisma.teams.updateMany({ where: { short_name: 'NYK' }, data: { logo_url: '/ny.png' } });

    return NextResponse.json({
      success: true,
      message: "Binary Assets Deployed and DB Aligned.",
      results
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
