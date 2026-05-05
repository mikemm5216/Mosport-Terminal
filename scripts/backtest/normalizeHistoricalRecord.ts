import { HistoricalGameRecord } from "../../types/historical";

export function normalizeHistoricalRecord(record: HistoricalGameRecord): HistoricalGameRecord {
  // 目前僅做基礎結構複製與基礎清理，未來可加入更複雜的映射邏輯
  return {
    ...record,
    startTime: new Date(record.startTime).toISOString(),
  };
}
