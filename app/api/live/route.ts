import { NextResponse } from 'next/server';
import { redis } from '../../../lib/redis';

export async function GET() {
  try {
    // Scan or fetch specific keys based on active matches
    // Here we query all live score keys
    const keys = await redis.keys('live:score:*');
    const liveScores = [];

    if (keys.length > 0) {
      const payloads = await redis.mget(...keys);
      for (const p of payloads) {
        if (p) liveScores.push(JSON.parse(p));
      }
    }

    return NextResponse.json({ success: true, liveScores });
  } catch (error: any) {
    return NextResponse.json({ success: false, liveScores: [] });
  }
}
