import { TheSportsDBAdapter } from "./thesportsdb";
import { IngestionAdapter, IngestionPageResult, NormalizedEvent } from "./types";
import { IngestionJob } from "../types";

// Sportradar adapter — bridges TheSportsDB until a Sportradar API key is provisioned.
// Replace the delegate with a real SportsradarAPIAdapter once SPORTRADAR_API_KEY is set.
export class SportradarAdapter implements IngestionAdapter {
  private delegate: IngestionAdapter;

  constructor() {
    const key = process.env.SPORTRADAR_API_KEY;
    if (key) {
      // TODO: swap in real Sportradar implementation when key is available
      console.warn("SportradarAdapter: SPORTRADAR_API_KEY set but real adapter not yet implemented; using TheSportsDB");
    }
    this.delegate = new TheSportsDBAdapter(process.env.THESPORTSDB_API_KEY ?? "3");
  }

  fetchPage(job: IngestionJob): Promise<IngestionPageResult> {
    return this.delegate.fetchPage(job);
  }

  normalize(event: any, job: IngestionJob): NormalizedEvent {
    return this.delegate.normalize(event, job);
  }
}
