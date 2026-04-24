import type { DataProvider, AgentProviderResult, AgentLeague } from "../types";

const LEAGUE_PATH: Record<AgentLeague, string> = {
  EPL: "soccer/eng.1",
  NBA: "basketball/nba",
  MLB: "baseball/mlb",
};

export class ESPNProvider implements DataProvider {
  name = "espn" as const;

  async fetchSchedule({ league, date }: { league: AgentLeague; date: string }): Promise<AgentProviderResult> {
    if (process.env.INGEST_FORCE_ESPN_FAIL === "1") {
      throw new Error("[test] ESPN forced failure via INGEST_FORCE_ESPN_FAIL=1");
    }

    const path = LEAGUE_PATH[league];
    if (!path) throw new Error(`ESPN: unsupported league ${league}`);

    const dateStr = date.replace(/-/g, "");
    const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard?dates=${dateStr}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    } as RequestInit);

    if (!res.ok) throw new Error(`ESPN HTTP ${res.status} for ${league} on ${date}`);

    const data = await res.json();

    return {
      provider: "espn",
      league,
      rawEvents: data.events ?? [],
      fetchedAt: new Date().toISOString(),
    };
  }
}
