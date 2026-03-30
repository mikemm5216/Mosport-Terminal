import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';

export async function GET() {
  try {
    const teams = await db.teams.findMany({
      include: {
        matches_home: {
          take: 20,
          orderBy: { date: 'desc' },
          select: { homeScore: true, awayScore: true, status: true },
        },
        matches_away: {
          take: 20,
          orderBy: { date: 'desc' },
          select: { homeScore: true, awayScore: true, status: true },
        },
      },
    });

    const formattedTeams = teams.map((t: any) => {
      const logoUrl = t.logo_url?.includes('||')
        ? t.logo_url.split('||')[1]
        : t.logo_url;

      // Aggregate stats from recent matches
      const homeGames = t.matches_home || [];
      const awayGames = t.matches_away || [];
      const allGames = [
        ...homeGames.map((m: any) => ({ scored: m.homeScore, conceded: m.awayScore, isHome: true, status: m.status })),
        ...awayGames.map((m: any) => ({ scored: m.awayScore, conceded: m.homeScore, isHome: false, status: m.status })),
      ];

      const completed = allGames.filter((g) => g.status === 'COMPLETED');
      const wins = completed.filter((g) => g.scored > g.conceded).length;
      const total = completed.length;

      const avgScored = total > 0 ? completed.reduce((s, g) => s + (g.scored || 0), 0) / total : 0;
      const avgConceded = total > 0 ? completed.reduce((s, g) => s + (g.conceded || 0), 0) / total : 0;

      const winRate = total > 0 ? wins / total : 0;
      const strengthRatio = avgConceded > 0 ? avgScored / avgConceded : (avgScored > 0 ? 1.5 : 1.0);
      const momentum = total >= 3
        ? completed.slice(0, 3).filter((g) => g.scored > g.conceded).length / 3
        : winRate;

      return {
        // base fields
        team_id: t.team_id,
        name: t.name,
        sport: t.sport,
        league: t.league,
        logo_url: logoUrl,
        home_city: t.home_city ?? null,
        // ── Fix 4: no more N/A — computed from real match history ──
        stats: {
          games_played: total,
          wins,
          losses: total - wins,
          win_rate: parseFloat(winRate.toFixed(3)),
          avg_scored: parseFloat(avgScored.toFixed(1)),
          avg_conceded: parseFloat(avgConceded.toFixed(1)),
          strength_ratio: parseFloat(strengthRatio.toFixed(3)),
          momentum: parseFloat(momentum.toFixed(3)),
          form: total === 0 ? 'AWAITING DATA' : `${wins}W-${total - wins}L`,
        },
      };
    });

    return NextResponse.json({ success: true, teams: formattedTeams });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, teams: [] });
  }
}
