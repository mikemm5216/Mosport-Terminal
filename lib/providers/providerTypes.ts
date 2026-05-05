import { PregameFeatureSet } from "../../types/features";

export interface SportsDataProvider {
  name: string;
  getPregameGames(league: string): Promise<NormalizedProviderGame[]>;
}

export type NormalizedProviderGame = {
  matchId: string;
  league: string;
  sport: string;
  startTime: string;
  homeTeamId: string;
  awayTeamId: string;
  rawFeatures: Record<string, any>;
};
