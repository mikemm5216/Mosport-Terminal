import { IngestionAdapter, IngestionPageResult, NormalizedEvent } from "./types";
import { IngestionJob } from "../types";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

const LEAGUE_MAP: Record<string, { sport: string; path: string }> = {
  EPL: { sport: "soccer", path: "soccer/eng.1" },
  UCL: { sport: "soccer", path: "soccer/uefa.champions" },
  NBA: { sport: "basketball", path: "basketball/nba" },
  MLB: { sport: "baseball", path: "baseball/mlb" },
};

const ESPN_STATUS_MAP: Record<string, NormalizedEvent["status"]> = {
  pre: "scheduled",
  in: "live",
  post: "closed",
};

function getDateStr(daysOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

export class ESPNAdapter implements IngestionAdapter {
  async fetchPage(job: IngestionJob): Promise<IngestionPageResult> {
    const leagueKey = job.league.toUpperCase();
    const mapping = LEAGUE_MAP[leagueKey];
    if (!mapping) throw new Error(`ESPN: unknown league ${job.league}`);

    // page 1 = today, page 2 = tomorrow, page 3 = yesterday; isLastPage on page 3
    const offsets: Record<number, number> = { 1: 0, 2: 1, 3: -1 };
    const page = job.currentPage ?? 1;
    const offset = offsets[page] ?? 0;
    const dateStr = getDateStr(offset);

    const url = `${ESPN_BASE}/${mapping.path}/scoreboard?dates=${dateStr}`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 0 },
    } as RequestInit);

    if (!res.ok) throw new Error(`ESPN HTTP ${res.status} for ${job.league}`);

    const data = await res.json();
    const events: any[] = data.events ?? [];

    return {
      data: events,
      isLastPage: page >= 3,
      nextPage: page < 3 ? page + 1 : undefined,
    };
  }

  normalize(event: any, job: IngestionJob): NormalizedEvent {
    const comp = event.competitions?.[0];
    const home = comp?.competitors?.find((c: any) => c.homeAway === "home");
    const away = comp?.competitors?.find((c: any) => c.homeAway === "away");
    const espnStatus = event.status?.type?.state ?? "pre";

    return {
      extId: String(event.id),
      sport: job.sport,
      league: job.league,
      homeTeam: home?.team?.displayName ?? home?.team?.name ?? "Unknown",
      awayTeam: away?.team?.displayName ?? away?.team?.name ?? "Unknown",
      startTime: new Date(event.date),
      status: ESPN_STATUS_MAP[espnStatus] ?? "scheduled",
      homeScore: home?.score !== undefined ? parseInt(home.score, 10) : undefined,
      awayScore: away?.score !== undefined ? parseInt(away.score, 10) : undefined,
      rawData: event,
    };
  }
}
