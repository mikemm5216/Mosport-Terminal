import { SportsDataProvider } from "./providerTypes";
import { EspnAdapter } from "./adapters/espnAdapter";
import { ManualHistoricalAdapter } from "./adapters/manualHistoricalAdapter";

export const PROVIDERS: Record<string, SportsDataProvider> = {
  ESPN: new EspnAdapter(),
  MANUAL_HISTORICAL: new ManualHistoricalAdapter(),
};

export function getProvider(name: string): SportsDataProvider {
  return PROVIDERS[name] || PROVIDERS.ESPN;
}
