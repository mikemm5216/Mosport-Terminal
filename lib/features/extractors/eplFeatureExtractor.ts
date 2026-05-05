import type { HistoricalGameRecord } from "../../../types/historical";
import type { EPLPregameFeatures } from "../../../types/features";
import type { FeatureExtractionResult, SportFeatureExtractor } from "../featureExtractorTypes";
import { calculateFeatureCompleteness } from "../featureCompleteness";

const REQUIRED = ["pressResistance", "midfieldControl", "setPieceRisk", "fixtureCongestion", "strikerForm", "defensiveLineRisk", "recentFormScore"];

function flatten(record: HistoricalGameRecord, epl: EPLPregameFeatures): Record<string, unknown> {
  return {
    ...epl,
    recentFormScore: record.pregameSnapshot.features.teamContext?.home?.recentFormScore,
  };
}

export const eplFeatureExtractor: SportFeatureExtractor = {
  league: "EPL",
  version: "15.0.0",
  extractFromHistorical(record: HistoricalGameRecord): FeatureExtractionResult {
    const base = record.pregameSnapshot.features;
    const epl = base.epl || ({ featureStatus: "MISSING", missingEvidence: [], sourceFieldsUsed: [] } as EPLPregameFeatures);
    const completeness = calculateFeatureCompleteness(REQUIRED, flatten(record, epl), { ready: 5 / 7, partial: 0.4 });
    const missingEvidence = [...new Set([...(epl.missingEvidence || []), ...completeness.missing])];
    const sourceFieldsUsed = [...new Set([...(epl.sourceFieldsUsed || []), "pregameSnapshot.features.epl", "teamContext.home"])] ;
    const featureSet = {
      ...base,
      matchId: record.matchId,
      league: record.league,
      sport: record.sport,
      homeTeamId: record.homeTeamId,
      awayTeamId: record.awayTeamId,
      homeTeamName: record.homeTeamName || base.homeTeamName,
      awayTeamName: record.awayTeamName || base.awayTeamName,
      epl: { ...epl, featureStatus: completeness.status, missingEvidence, sourceFieldsUsed },
      dataQuality: { ...base.dataQuality, completenessScore: completeness.completenessScore, missing: missingEvidence, provider: record.pregameSnapshot.provider },
    };
    return { matchId: record.matchId, league: "EPL", featureSet, featureStatus: completeness.status, missingEvidence, sourceFieldsUsed, extractorVersion: this.version, completenessScore: completeness.completenessScore };
  },
};
