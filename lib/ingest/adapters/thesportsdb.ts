import { IngestionAdapter, IngestionPageResult, NormalizedEvent } from "./types";
import { IngestionJob } from "../types";

export class TheSportsDBAdapter implements IngestionAdapter {
    private apiKey: string;
    private baseUrl: string = "https://www.thesportsdb.com/api/v1/json";

    constructor(apiKey: string = "3") { // Default test key
        this.apiKey = apiKey;
    }

    async fetchPage(job: IngestionJob): Promise<IngestionPageResult> {
        const { league, sport, currentPage } = job;

        // Map league name to ID if needed, or use job's meta
        const leagueId = this.getLeagueId(league);
        const season = "2024-2025"; // In a real app, this might be dynamic

        // TheSportsDB often uses season-wide fetching or date-based
        // For queue-based "paging", we simulate it if the API doesn't support offset
        const url = `${this.baseUrl}/${this.apiKey}/eventsseason.php?id=${leagueId}&s=${season}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`TheSportsDB error: ${response.status}`);

        const data = await response.json();
        const events = data.events || [];

        return {
            data: events,
            isLastPage: true, // TheSportsDB season API usually returns all at once
        };
    }

    normalize(event: any, job: IngestionJob): NormalizedEvent {
        return {
            extId: String(event.idEvent),
            sport: job.sport,
            league: job.league,
            homeTeam: event.strHomeTeam,
            awayTeam: event.strAwayTeam,
            startTime: new Date(`${event.dateEvent}T${event.strTime || "00:00:00"}Z`),
            rawData: event,
        };
    }

    private getLeagueId(leagueName: string): string {
        const mapping: Record<string, string> = {
            "English Premier League": "4328",
            "UEFA Champions League": "4480",
            "La Liga": "4335",
            "NBA": "4387",
            "MLB": "4424",
        };
        return mapping[leagueName] || "4328";
    }
}
