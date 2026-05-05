import * as fs from "fs";

export async function loadHistoricalCorpus(filePath: string): Promise<any[]> {
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: Corpus file not found at ${filePath}. Returning empty set.`);
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8");
  return content.split("\n").filter(line => line.trim()).map(line => JSON.parse(line));
}
