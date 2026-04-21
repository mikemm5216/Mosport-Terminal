import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateCronAuth } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const error = await validateCronAuth(request.clone());
    if (error) return error;

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
      // 🛡️ BINARY INJECTION (ENSURE NON-ZERO SIZE)
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
      status: "ok",
      timestamp: new Date().toISOString(),
      latency: `${Date.now() - startTime}ms`,
      data: {
        message: "Binary Assets Deployed and DB Aligned.",
        results
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      error: error.message,
      latency: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
