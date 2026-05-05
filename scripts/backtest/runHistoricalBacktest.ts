import { loadHistoricalCorpus } from "./loadHistoricalCorpus";
import { evaluateBacktestRun } from "./evaluateBacktestRun";
import { writeBacktestReport } from "./writeBacktestReport";

async function main() {
  const args = process.argv.slice(2);
  const inputArg = args.find(a => a.startsWith("--input="))?.split("=")[1] || "data/historical/mosport_9500.jsonl";
  const outputDir = args.find(a => a.startsWith("--output="))?.split("=")[1] || "data/backtest-artifacts";

  console.log(`Starting historical backtest with input: ${inputArg}`);

  const corpus = await loadHistoricalCorpus(inputArg);
  const results = await evaluateBacktestRun(corpus);
  await writeBacktestReport(results, inputArg, outputDir);

  console.log("Backtest pipeline complete.");
}

main().catch(console.error);
