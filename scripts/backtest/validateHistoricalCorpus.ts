import fs from "fs";
import path from "path";
import readline from "readline";
import { HistoricalGameRecord, HistoricalCorpusValidationResult } from "../../types/historical";

async function validateCorpus(inputPath: string, outputDir: string) {
  const stats: HistoricalCorpusValidationResult = {
    ok: true,
    totalRecords: 0,
    validRecords: 0,
    invalidRecords: 0,
    byLeague: {},
    errors: [],
  };

  const seenMatchIds = new Set<string>();
  const validLeagues = ["NBA", "MLB", "NHL", "NFL", "EPL"];

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(inputPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let row = 0;
  for await (const line of rl) {
    row++;
    if (!line.trim()) continue;
    stats.totalRecords++;

    try {
      const record = JSON.parse(line) as HistoricalGameRecord;
      const errors: string[] = [];

      if (!record.matchId) errors.push("Missing matchId");
      if (!record.league) errors.push("Missing league");
      if (!record.sport) errors.push("Missing sport");
      if (!record.homeTeamId) errors.push("Missing homeTeamId");
      if (!record.awayTeamId) errors.push("Missing awayTeamId");
      if (!record.startTime) errors.push("Missing startTime");
      if (!record.pregameSnapshot) errors.push("Missing pregameSnapshot");
      if (record.pregameSnapshot && !record.pregameSnapshot.features) errors.push("Missing pregameSnapshot.features");
      if (!record.finalResult) errors.push("Missing finalResult");
      if (record.finalResult && !record.finalResult.winnerTeamId) errors.push("Missing finalResult.winnerTeamId");

      if (record.finalResult && record.finalResult.winnerTeamId) {
        if (record.finalResult.winnerTeamId !== record.homeTeamId && record.finalResult.winnerTeamId !== record.awayTeamId) {
          errors.push(`winnerTeamId (${record.finalResult.winnerTeamId}) matches neither home (${record.homeTeamId}) nor away (${record.awayTeamId})`);
        }
      }

      if (record.matchId && seenMatchIds.has(record.matchId)) {
        errors.push(`Duplicate matchId: ${record.matchId}`);
      }
      if (record.matchId) seenMatchIds.add(record.matchId);

      if (record.league && !validLeagues.includes(record.league)) {
        errors.push(`Invalid league: ${record.league}`);
      }

      if (errors.length > 0) {
        stats.invalidRecords++;
        errors.forEach(reason => {
          stats.errors.push({ matchId: record.matchId, row, reason });
        });
      } else {
        stats.validRecords++;
        stats.byLeague[record.league] = (stats.byLeague[record.league] || 0) + 1;
      }
    } catch (e: any) {
      stats.invalidRecords++;
      stats.errors.push({ row, reason: `Invalid JSON: ${e.message}` });
    }
  }

  stats.ok = stats.invalidRecords === 0;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, `corpus_validation_${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(stats, null, 2));

  const mdPath = path.join(outputDir, `corpus_validation_${timestamp}.md`);
  const mdContent = `
# Historical Corpus Validation Report

Generated: ${new Date().toISOString()}
Input: ${inputPath}

## Summary
- **Status**: ${stats.ok ? "✅ PASS" : "❌ FAIL"}
- **Total Records**: ${stats.totalRecords}
- **Valid Records**: ${stats.validRecords}
- **Invalid Records**: ${stats.invalidRecords}

## By League
${Object.entries(stats.byLeague).map(([league, count]) => `- ${league}: ${count}`).join("\n")}

## Errors
${stats.errors.length > 0 ? stats.errors.map(err => `- Row ${err.row}${err.matchId ? ` (${err.matchId})` : ""}: ${err.reason}`).join("\n") : "None"}
`;
  fs.writeFileSync(mdPath, mdContent);

  console.log(`Validation complete. Status: ${stats.ok ? "PASS" : "FAIL"}`);
  console.log(`Report saved to: ${jsonPath}`);
  console.log(`Markdown report: ${mdPath}`);

  if (!stats.ok) {
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const inputArg = args.find(a => a.startsWith("--input="))?.split("=")[1];
const outputArg = args.find(a => a.startsWith("--output="))?.split("=")[1] || "data/backtest-artifacts";

if (!inputArg) {
  console.error("Usage: tsx validateHistoricalCorpus.ts --input=<path> [--output=<dir>]");
  process.exit(1);
}

validateCorpus(inputArg, outputArg);
