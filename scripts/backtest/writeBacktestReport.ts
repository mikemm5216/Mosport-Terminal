import * as fs from "fs";
import * as path from "path";
import { CURRENT_ENGINE_VERSION } from "../../lib/engine/engineAudit";

export async function writeBacktestReport(results: any, inputFile: string, outputDir: string) {
  fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportId = `backtest_${timestamp}`;

  const fullReport = {
    ...CURRENT_ENGINE_VERSION,
    inputFile,
    inputSha256: results.inputSha256,
    createdAt: new Date().toISOString(),
    ...results,
  };

  const jsonPath = path.join(outputDir, `${reportId}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(fullReport, null, 2));

  const canShowAccuracy = typeof fullReport.overallAccuracy === "number" && fullReport.gamesEvaluated >= 100;
  const accuracyLine = canShowAccuracy
    ? `- **Overall Accuracy:** ${(fullReport.overallAccuracy * 100).toFixed(2)}%`
    : `- **Overall Accuracy:** Suppressed — ${fullReport.sampleSizeWarning || "insufficient evaluated games."}`;

  const byLeague = Object.entries(fullReport.byLeague || {})
    .map(([league, data]: [string, any]) => {
      const leagueAccuracy = data.evaluated >= 100 && data.hits != null
        ? `${(data.hits / data.evaluated * 100).toFixed(2)}%`
        : "Suppressed";
      return [
        `### ${league}`,
        `- Total: ${data.total}`,
        `- Evaluated: ${data.evaluated}`,
        `- Skipped: ${data.skipped}`,
        `- READY: ${data.ready}`,
        `- PARTIAL: ${data.partial}`,
        `- MISSING: ${data.missing}`,
        `- Hits: ${data.hits}`,
        `- Misses: ${data.misses}`,
        `- Partial Hits: ${data.partialHits}`,
        `- Accuracy: ${leagueAccuracy}`,
      ].join("\n");
    })
    .join("\n\n");

  const mdContent = `# Mosport Backtest Report: ${reportId}

## Metadata
- **Engine Version:** ${fullReport.engineVersion}
- **Feature Version:** ${fullReport.featureVersion}
- **Translator Version:** ${fullReport.translatorVersion}
- **Input File:** ${fullReport.inputFile}
- **Input SHA256:** ${fullReport.inputSha256}
- **Generated At:** ${fullReport.createdAt}

## Summary
- **Games Total:** ${fullReport.gamesTotal ?? "N/A"}
- **Games Evaluated:** ${fullReport.gamesEvaluated}
- **Games Skipped:** ${fullReport.gamesSkipped}
- **Skip Rate:** ${((fullReport.skipRate || 0) * 100).toFixed(2)}%
${accuracyLine}
${fullReport.sampleSizeWarning ? `- **Claim Warning:** ${fullReport.sampleSizeWarning}` : ""}

## Feature Coverage
- **Average Completeness:** ${((fullReport.coverage?.featureCompletenessAvg || 0) * 100).toFixed(2)}%
- **READY Rate:** ${((fullReport.coverage?.readyRate || 0) * 100).toFixed(2)}%
- **PARTIAL Rate:** ${((fullReport.coverage?.partialRate || 0) * 100).toFixed(2)}%
- **MISSING Rate:** ${((fullReport.coverage?.missingRate || 0) * 100).toFixed(2)}%

## By League
${byLeague || "No league data."}

## Skip Reasons
${Object.entries(fullReport.skipReasons || {}).map(([reason, count]) => `- **${reason}:** ${count}`).join("\n") || "None"}

---

This report is an auditable engineering artifact. It is not a public performance claim unless it satisfies the thresholds in docs/MODEL_CLAIMS_AUDIT.md.
`;

  const mdPath = path.join(outputDir, `${reportId}.md`);
  fs.writeFileSync(mdPath, mdContent);

  return { jsonPath, mdPath };
}
