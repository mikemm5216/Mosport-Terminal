import type { HistoricalGameRecord } from "../../types/historical";

export type CorpusStats = {
  total: number;
  byLeague: Record<string, number>;
  bySport: Record<string, number>;
  seasons: Record<string, number>;
};

export function calculateCorpusStats(records: HistoricalGameRecord[]): CorpusStats {
  const stats: CorpusStats = { total: records.length, byLeague: {}, bySport: {}, seasons: {} };
  for (const record of records) {
    stats.byLeague[record.league] = (stats.byLeague[record.league] || 0) + 1;
    stats.bySport[record.sport] = (stats.bySport[record.sport] || 0) + 1;
    const season = record.season || "UNKNOWN";
    stats.seasons[season] = (stats.seasons[season] || 0) + 1;
  }
  return stats;
}
