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
    const teamMappings = [
      { short: 'LAD', path: '/lad.png' },
      { short: 'SDP', path: '/sd.png' },
      { short: 'BKN', path: '/bkn.png' },
      { short: 'NYK', path: '/ny.png' },
      { short: 'SFG', path: '/sf.png' },
      { short: 'SEA', path: '/sea.png' },
      { short: 'TEX', path: '/tex.png' },
      { short: 'CHW', path: '/chw.png' }
    ];

    for (const mapping of teamMappings) {
      await prisma.teams.updateMany({
        where: { short_name: mapping.short },
        data: { logo_url: mapping.path }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Binary Assets Deployed and DB Aligned.",
      results
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
