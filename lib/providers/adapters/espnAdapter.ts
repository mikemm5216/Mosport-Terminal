import { NormalizedProviderGame, SportsDataProvider } from "../providerTypes";

export class EspnAdapter implements SportsDataProvider {
  name = "ESPN";

  async getPregameGames(league: string): Promise<NormalizedProviderGame[]> {
    // Skeleton for ESPN data ingestion
    return [];
  }
}
