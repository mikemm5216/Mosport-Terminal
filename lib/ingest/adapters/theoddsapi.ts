import { IngestionAdapter, IngestionPageResult, NormalizedEvent } from "./types";
import { IngestionJob } from "../types";

export class TheOddsAPIAdapter implements IngestionAdapter {
    private apiKey: string;
    private baseUrl: string = "https://api.the-odds-api.com/v4/sports";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async fetchPage(job: IngestionJob): Promise<IngestionPageResult> {
        const { sport, league } = job;

        // Example: soccer_epl, americanfootball_nba, etc.
        const sportKey = this.getSportKey(sport, league);
        const url = `${this.baseUrl}/${sportKey}/odds/?apiKey=${this.apiKey}&regions=us,uk&markets=h2h`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`The Odds API error: ${response.status}`);

        const data = await response.json();

        return {
            data: data, // Array of matches with odds
            isLastPage: true,
        };
    }

    normalize(event: any, job: IngestionJob): NormalizedEvent {
        return {
            extId: String(event.id), // The Odds API match ID
            sport: job.sport,
            league: job.league,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            startTime: new Date(event.commence_time),
            rawData: event,
        };
    }

    private getSportKey(sport: string, league: string): string {
        const mapping: Record<string, string> = {
            "NBA": "basketball_nba",
            "MLB": "baseball_mlb",
            "English Premier League": "soccer_epl",
        };
        return mapping[league] || "soccer_epl";
    }
}
