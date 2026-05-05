import { NormalizedProviderGame, SportsDataProvider } from "../providerTypes";

export class ManualHistoricalAdapter implements SportsDataProvider {
  name = "MANUAL_HISTORICAL";

  async getPregameGames(league: string): Promise<NormalizedProviderGame[]> {
    // This adapter will be used for backtesting with local JSONL files.
    return [];
  }
}
