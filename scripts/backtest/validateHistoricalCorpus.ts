import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import type { HistoricalCorpusValidationError, HistoricalCorpusValidationResult } from "../../types/historical";
import { normalizeHistoricalRecord } from "./normalizeHistoricalRecord";

const SUPPORTED_LEAGUES = new Set(["NBA", "MLB", "NHL", "NFL", "EPL"]);

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    input: args.find((a) => a.startsWith("--input="))?.split("=")[1] || "data/historical/mosport_9500.jsonl",
    output: args.find((a) => a.startsWith("--output="))?.split("=")[1] || "data/backtest-artifacts",
  };
}

function addError(errors: HistoricalCorpusValidationError[], row: number, reason: string, matchId?: string) {
  errors.push({ row, reason, matchId });
}

function validateRecord(record: any, row: number, seen: Set<string>, errors: HistoricalCorpusValidationError[]) {
  if (!record.matchId) addError(errors, row, "MISSING_MATCH_ID");
  if (record.matchId && seen.has(record.matchId)) addError(errors, row, "DUPLICATE_MATCH_ID", record.matchId);
  if (record.matchId) seen.add(record.matchId);

  if (!record.league || !SUPPORTED_LEAGUES.has(record.league)) addError(errors, row, "INVALID_LEAGUE", record.matchId);
  if (!record.sport) addError(errors, row, "MISSING_SPORT", record.matchId);
  if (!record.homeTeamId) addError(errors, row, "MISSING_HOME_TEAM_ID", record.matchId);
  if (!record.awayTeamId) addError(errors, row, "MISSING_AWAY_TEAM_ID", record.matchId);
  if (!record.startTime) addError(errors, row, "MISSING_START_TIME", record.matchId);
  if (!record.pregameSnapshot) addError(errors, row, "MISSING_PREGAME_SNAPSHOT", record.matchId);
  if (!record.pregameSnapshot?.features) addError(errors, row, "MISSING_PREGAME_FEATURES", record.matchId);
  if (!record.finalResult) addError(errors, row, "MISSING_FINAL_RESULT", record.matchId);
  if (!record.finalResult?.winnerTeamId) addError(errors, row, "MISSING_WINNER_TEAM_ID", record.matchId);
  if (
    record.finalResult?.winnerTeamId &&
    record.finalResult.winnerTeamId !== record.homeTeamId &&
    record.finalResult.winnerTeamId !== record.awayTeamId
  ) {
    addError(errors, row, "WINNER_TEAM_ID_NOT_IN_MATCH", record.matchId);
  }
}

async function main() {
  const { input, output } = parseArgs();
  if (!fs.existsSync(input)) {
    console.error(`Input file not found: ${input}`);
    process.exit(1);
  }

  fs.mkdirSync(output, { recursive: true });
  const raw = fs.readFileSync(input, "utf8");
  const inputSha256 = crypto.createHash("sha256").update(raw).digest("hex");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const errors: HistoricalCorpusValidationError[] = [];
  const byLeague: Record<string, number> = {};
  const seen = new Set<string>();

  let validRecords = 0;

  lines.forEach((line, index) => {
    const row = index + 1;
    try {
      const parsed = JSON.parse(line);
      const record = normalizeHistoricalRecord(parsed, row, input);
      const before = errors.length;
      validateRecord(record, row, seen, errors);
      if (errors.length === before) {
        validRecords += 1;
        byLeague[record.league] = (byLeague[record.league] || 0) + 1;
      }
    } catch (error) {
      addError(errors, row, `INVALID_JSON_OR_RECORD:${error instanceof Error ? error.message : String(error)}`);
    }
  });

  const result: HistoricalCorpusValidationResult & { inputFile: string; inputSha256: string; createdAt: string } = {
    ok: errors.length === 0,
    totalRecords: lines.length,
    validRecords,
    invalidRecords: lines.length - validRecords,
    byLeague,
    errors,
    inputFile: input,
    inputSha256,
    createdAt: new Date().toISOString(),
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(output, `corpus_validation_${timestamp}.json`);
  const mdPath = path.join(output, `corpus_validation_${timestamp}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  fs.writeFileSync(
    mdPath,
    `# Historical Corpus Validation\n\n- **Input:** ${input}\n- **Input SHA256:** ${inputSha256}\n- **Total Records:** ${result.totalRecords}\n- **Valid Records:** ${result.validRecords}\n- **Invalid Records:** ${result.invalidRecords}\n- **Status:** ${result.ok ? "PASS" : "FAIL"}\n\n## By League\n${Object.entries(byLeague).map(([league, count]) => `- **${league}:** ${count}`).join("\n")}\n\n## Errors\n${errors.length === 0 ? "None" : errors.map((e) => `- Row ${e.row}${e.matchId ? ` (${e.matchId})` : ""}: ${e.reason}`).join("\n")}\n`
  );

  console.log(`Corpus validation ${result.ok ? "PASS" : "FAIL"}`);
  console.log(`Total Records: ${result.totalRecords}`);
  console.log(`Valid Records: ${result.validRecords}`);
  console.log(`Invalid Records: ${result.invalidRecords}`);
  console.log(`Report JSON: ${jsonPath}`);
  console.log(`Report Markdown: ${mdPath}`);

  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
