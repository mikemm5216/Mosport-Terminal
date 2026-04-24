import type { HistoricalDataLoader, HistoricalMatch } from "./types";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

const LEAGUE_PATHS: Record<string, { path: string }> = {
  NBA: { path: "basketball/nba" },
  MLB: { path: "baseball/mlb" },
  EPL: { path: "soccer/eng.1" },
  UCL: { path: "soccer/uefa.champions" },
  NHL: { path: "hockey/nhl" },
};

// Approximate total game duration in minutes (used for synthetic 75% snapshot)
function toESPNDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, "");
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class ESPNHistoricalLoader implements HistoricalDataLoader {
  private readonly delayMs: number;

  constructor(opts?: { delayMs?: number }) {
    this.delayMs = opts?.delayMs ?? 400;
  }

  async loadCompletedMatches(input: {
    leagues: Array<"NBA" | "MLB" | "EPL" | "UCL" | "NHL">;
    startDate: string;
    endDate: string;
    limit?: number;
  }): Promise<HistoricalMatch[]> {
    const all: HistoricalMatch[] = [];
    const cap = input.limit ?? 500;

    for (const league of input.leagues) {
      if (all.length >= cap) break;
      const perLeagueCap = Math.ceil(cap / input.leagues.length);
      try {
        const matches = await this.fetchLeague(
          league, input.startDate, input.endDate, perLeagueCap,
        );
        all.push(...matches);
      } catch (err) {
        console.warn(`[ESPN] Failed to load ${league}:`, String(err));
      }
    }

    return all.slice(0, cap);
  }

  private async fetchLeague(
    league: string,
    startDate: string,
    endDate: string,
    limit: number,
  ): Promise<HistoricalMatch[]> {
    const mapping = LEAGUE_PATHS[league];
    if (!mapping) return [];

    const matches: HistoricalMatch[] = [];

    // Walk backward in 28-day windows from endDate
    let windowEnd = endDate;
    const stop = startDate;

    while (windowEnd > stop && matches.length < limit) {
      const windowStart = addDays(windowEnd, -27);
      const clampedStart = windowStart < stop ? stop : windowStart;

      const url =
        `${ESPN_BASE}/${mapping.path}/scoreboard` +
        `?dates=${toESPNDate(clampedStart)}-${toESPNDate(windowEnd)}&limit=200`;

      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          const data: any = await res.json();
          const events: any[] = data.events ?? [];

          for (const ev of events) {
            if (matches.length >= limit) break;
            const m = this.parseEvent(league, ev);
            if (m) matches.push(m);
          }
        }
      } catch {
        // Skip failed window — network error or rate limit
      }

      windowEnd = addDays(clampedStart, -1);
      await sleep(this.delayMs);
    }

    return matches;
  }

  private parseEvent(
    league: string,
    ev: any,
  ): HistoricalMatch | null {
    const comp = ev.competitions?.[0];
    if (!comp) return null;

    // Only completed games
    if (ev.status?.type?.state !== "post") return null;

    const home = comp.competitors?.find((c: any) => c.homeAway === "home");
    const away = comp.competitors?.find((c: any) => c.homeAway === "away");
    if (!home || !away) return null;

    const finalHomeScore = parseInt(String(home.score ?? ""), 10);
    const finalAwayScore = parseInt(String(away.score ?? ""), 10);
    if (isNaN(finalHomeScore) || isNaN(finalAwayScore)) return null;

    const startsAt = ev.date;
    if (!startsAt || typeof startsAt !== "string") return null;

    // Historical ESPN mode is pregame-only for anti-lookahead safety.
    // Final scores are retained strictly as evaluation outcomes.
    const snapshotAt = new Date(new Date(startsAt).getTime() - 60 * 60_000).toISOString();
    const marketHomeProb: number | null = null;

    const homeTeam =
      home.team?.abbreviation ??
      home.team?.shortDisplayName ??
      "HOME";
    const awayTeam =
      away.team?.abbreviation ??
      away.team?.shortDisplayName ??
      "AWAY";

    return {
      matchId: `espn-${league.toLowerCase()}-${ev.id}`,
      league: league as HistoricalMatch["league"],
      homeTeam,
      awayTeam,
      status: "scheduled",
      homeScore: null as unknown as number,
      awayScore: null as unknown as number,
      startsAt,
      snapshotAt,
      marketHomeProb,
      finalHomeScore,
      finalAwayScore,
    };
  }
}
