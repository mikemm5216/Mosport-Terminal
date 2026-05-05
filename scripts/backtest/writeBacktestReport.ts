import * as fs from "fs";
import * as path from "path";
import { CURRENT_ENGINE_VERSION } from "../../lib/engine/engineAudit";

export async function writeBacktestReport(results: any, inputFile: string, outputDir: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportId = `backtest_${timestamp}`;
  
  const fullReport = {
    ...CURRENT_ENGINE_VERSION,
    inputFile,
    createdAt: new Date().toISOString(),
    ...results,
  };

  const jsonPath = path.join(outputDir, `${reportId}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(fullReport, null, 2));

  const mdContent = `
# Mosport Backtest Report: ${reportId}

## Metadata
- **Engine Version:** ${fullReport.engineVersion}
- **Feature Version:** ${fullReport.featureVersion}
- **Translator Version:** ${fullReport.translatorVersion}
- **Input File:** ${fullReport.inputFile}
- **Generated At:** ${fullReport.createdAt}

## Summary
- **Games Evaluated:** ${fullReport.gamesEvaluated}
- **Games Skipped:** ${fullReport.gamesSkipped}
- **Overall Accuracy:** ${(fullReport.overallAccuracy * 100).toFixed(2)}%

## By League
${Object.entries(fullReport.byLeague).map(([league, data]: [string, any]) => 
  `- **${league}:** ${data.count} games, ${(data.hits / data.count * 100).toFixed(2)}% accuracy`
).join("\n")}

## Skip Reasons
${Object.entries(fullReport.skipReasons).map(([reason, count]) => 
  `- **${reason}:** ${count}`
).join("\n")}
`;

  const mdPath = path.join(outputDir, `${reportId}.md`);
  fs.writeFileSync(mdPath, mdContent);

  console.log(`Reports generated:
  - ${jsonPath}
  - ${mdPath}`);
}
