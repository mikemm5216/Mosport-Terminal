import { HistoricalGameRecord } from "../../types/historical";

export function calculateCorpusStats(records: HistoricalGameRecord[]) {
  const total = records.length;
  const byLeague: Record<string, number> = {};
  
  records.forEach(r => {
    byLeague[r.league] = (byLeague[r.league] || 0) + 1;
  });

  return {
    total,
    byLeague,
  };
}
