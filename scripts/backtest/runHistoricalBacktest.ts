import { loadHistoricalCorpus } from "./loadHistoricalCorpus";
import { evaluateBacktestRun } from "./evaluateBacktestRun";
import { writeBacktestReport } from "./writeBacktestReport";
import * as crypto from "crypto";
import * as fs from "fs";

async function main() {
  const args = process.argv.slice(2);
  const inputArg = args.find(a => a.startsWith("--input="))?.split("=")[1] || "data/historical/mosport_9500.jsonl";
  const outputDir = args.find(a => a.startsWith("--output="))?.split("=")[1] || "data/backtest-artifacts";

  console.log(`Starting historical backtest with input: ${inputArg}`);

  if (!fs.existsSync(inputArg)) {
    console.error(`Error: Input file not found: ${inputArg}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(inputArg);
  const inputSha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  const corpus = await loadHistoricalCorpus(inputArg);
  const results = await evaluateBacktestRun(corpus);
  
  const reportPaths = await writeBacktestReport({
    ...results,
    inputSha256
  }, inputArg, outputDir);

  console.log("\n--- Backtest Run Summary ---");
  console.log(`Games Evaluated: ${results.gamesEvaluated}`);
  console.log(`Games Skipped: ${results.gamesSkipped}`);
  console.log(`Engine Version: ${results.engineVersion || "14.0.0"}`);
  console.log(`Input SHA256: ${inputSha256}`);
  console.log(`Report JSON: ${reportPaths.jsonPath}`);
  console.log(`Report Markdown: ${reportPaths.mdPath}`);
  console.log("----------------------------\n");

  console.log("Backtest pipeline complete.");
}

main().catch(console.error);
