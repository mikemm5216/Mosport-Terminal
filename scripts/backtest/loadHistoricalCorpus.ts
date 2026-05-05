import * as fs from "fs";
import type { HistoricalGameRecord } from "../../types/historical";
import { normalizeHistoricalRecord } from "./normalizeHistoricalRecord";

export async function loadHistoricalCorpus(filePath: string): Promise<HistoricalGameRecord[]> {
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: Corpus file not found at ${filePath}. Returning empty set.`);
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8");
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => normalizeHistoricalRecord(JSON.parse(line), index + 1, filePath));
}
