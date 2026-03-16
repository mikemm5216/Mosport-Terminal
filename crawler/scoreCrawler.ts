import { redis } from '../lib/redis';
import { db } from '../lib/db';

export async function runScoreCrawler() {
  console.log("[Score Crawler] Fetching delayed live scores to Redis cache...");
  
  // Find all matches currently marked as 'live'
  const liveMatches = await db.matches.findMany({
    where: { status: 'live' },
    select: { match_id: true, league: { select: { sport: true } }, home_team: { select: { team_name: true } }, away_team: { select: { team_name: true } } }
  });

  if (liveMatches.length === 0) return;

  // Mock fetching live data for these matches
  // In reality, you'd batch request an external API like Sportradar here
  for (const match of liveMatches) {
    const sportStr = match.league.sport.toLowerCase();
    const redisKey = `live:score:${sportStr}:${match.home_team.team_name}-${match.away_team.team_name}`.replace(/\s+/g, '');
    
    // Simulating a delayed live score payload
    const payload = JSON.stringify({
      match_id: match.match_id,
      home_score: Math.floor(Math.random() * 100),
      away_score: Math.floor(Math.random() * 100),
      time_elapsed: "45:00",
      delay: "60s"
    });

    // Save to Redis with 30-second TTL to prevent stale reads
    await redis.setex(redisKey, 30, payload);
    console.log(`[Score Crawler] Updated Redis cache for ${redisKey}`);
  }
}
