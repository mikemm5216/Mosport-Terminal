import { IngestionJob } from "../types";

export interface IngestionPageResult {
    data: any[];
    nextPage?: number;
    isLastPage: boolean;
}

export interface NormalizedEvent {
    extId: string;
    sport: string;
    league: string;
    homeTeam: string;
    awayTeam: string;
    startTime: Date;
    status?: "scheduled" | "live" | "closed" | "postponed" | "cancelled";
    homeScore?: number;
    awayScore?: number;
    rawData: any;
}

export interface IngestionAdapter {
    fetchPage(job: IngestionJob): Promise<IngestionPageResult>;
    normalize(providerData: any, job: IngestionJob): NormalizedEvent;
}
