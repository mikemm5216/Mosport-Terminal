import { SportradarAdapter } from "@/lib/ingest/adapters/sportradar";
import type { DataProvider, AgentProviderResult, AgentLeague } from "../types";
import type { SportType } from "@/lib/ingest/types";

const SPORT_MAP: Record<AgentLeague, SportType> = {
  MLB: "baseball",
  NBA: "basketball",
  EPL: "football",
};

export class SportradarProvider implements DataProvider {
  name = "sportradar" as const;

  async fetchSchedule({ league, date }: { league: AgentLeague; date: string }): Promise<AgentProviderResult> {
    const adapter = new SportradarAdapter();
    const sport = SPORT_MAP[league];

    const { data } = await adapter.fetchPage({ sport, league, currentPage: 1 });

    // TheSportsDB returns season-wide events — filter to the requested date
    const filtered = (data as any[]).filter((event: any) => {
      const eventDate = String(event.dateEvent ?? "").slice(0, 10);
      return eventDate === date;
    });

    return {
      provider: "sportradar",
      league,
      rawEvents: filtered,
      fetchedAt: new Date().toISOString(),
    };
  }
}
