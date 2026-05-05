import { NormalizedProviderGame } from "../providers/providerTypes";

export function validateGameFacts(game: NormalizedProviderGame): boolean {
  if (!game.matchId || !game.league || !game.sport) return false;
  if (!game.homeTeamId || !game.awayTeamId) return false;
  if (!game.startTime) return false;
  return true;
}
