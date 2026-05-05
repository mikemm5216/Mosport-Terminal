import { NormalizedProviderGame, SportsDataProvider } from "../providerTypes";

export class EspnAdapter implements SportsDataProvider {
  name = "ESPN";

  private LEAGUE_MAP: Record<string, { sport: string, league: string, url: string }> = {
    "NBA": { sport: "basketball", league: "nba", url: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard" },
    "MLB": { sport: "baseball", league: "mlb", url: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard" },
    "EPL": { sport: "soccer", league: "eng.1", url: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard" },
    "NHL": { sport: "hockey", league: "nhl", url: "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard" },
    "NFL": { sport: "football", league: "nfl", url: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard" },
  };

  async getPregameGames(leagueCode: string): Promise<NormalizedProviderGame[]> {
    const config = this.LEAGUE_MAP[leagueCode.toUpperCase()];
    if (!config) return [];

    try {
      const res = await fetch(config.url, { next: { revalidate: 0 } } as any);
      if (!res.ok) return [];
      const data = await res.json();

      const games: NormalizedProviderGame[] = [];

      for (const event of (data.events || [])) {
        const comp = event.competitions?.[0];
        const hComp = comp?.competitors?.find((c: any) => c.homeAway === "home");
        const aComp = comp?.competitors?.find((c: any) => c.homeAway === "away");

        const hRaw = hComp?.team?.abbreviation;
        const aRaw = aComp?.team?.abbreviation;
        
        const hTeamId = `${leagueCode.toUpperCase()}_${hRaw}`;
        const aTeamId = `${leagueCode.toUpperCase()}_${aRaw}`;

        games.push({
          matchId: `${leagueCode.toUpperCase()}-${event.id}`,
          league: leagueCode.toUpperCase(),
          sport: config.sport.toUpperCase(),
          startTime: event.date,
          homeTeamId: hTeamId,
          awayTeamId: aTeamId,
          rawFeatures: {
            homeTeamName: hComp?.team?.displayName || hComp?.team?.name,
            awayTeamName: aComp?.team?.displayName || aComp?.team?.name,
            homeScore: parseInt(hComp?.score || "0"),
            awayScore: parseInt(aComp?.score || "0"),
            status: event.status?.type?.state, // 'pre', 'in', 'post'
            // Add skeleton team context to avoid INSUFFICIENT_DATA if we want basic functionality
            teamContext: {
              home: { 
                name: hComp?.team?.displayName,
                abbreviation: hRaw
              },
              away: { 
                name: aComp?.team?.displayName,
                abbreviation: aRaw
              }
            }
          },
        });
      }

      return games;
    } catch (e) {
      console.error(`ESPN Adapter failed for ${leagueCode}:`, e);
      return [];
    }
  }
}
