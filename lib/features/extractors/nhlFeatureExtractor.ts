import type { HistoricalGameRecord } from "../../../types/historical";
import type { NHLPregameFeatures } from "../../../types/features";
import type { FeatureExtractionResult, SportFeatureExtractor } from "../featureExtractorTypes";
import { calculateFeatureCompleteness } from "../featureCompleteness";

const REQUIRED = ["goalieAdvantage", "backToBackFatigue", "specialTeamsEdge", "shotQualityEdge", "defensivePairingStability", "recentFormScore", "restDays"];

function flatten(record: HistoricalGameRecord, nhl: NHLPregameFeatures): Record<string, unknown> {
  return {
    ...nhl,
    recentFormScore: record.pregameSnapshot.features.teamContext?.home?.recentFormScore,
    restDays: record.pregameSnapshot.features.teamContext?.home?.restDays,
  };
}

export const nhlFeatureExtractor: SportFeatureExtractor = {
  league: "NHL",
  version: "15.0.0",
  extractFromHistorical(record: HistoricalGameRecord): FeatureExtractionResult {
    const base = record.pregameSnapshot.features;
    const nhl = base.nhl || ({ featureStatus: "MISSING", missingEvidence: [], sourceFieldsUsed: [] } as NHLPregameFeatures);
    const completeness = calculateFeatureCompleteness(REQUIRED, flatten(record, nhl), { ready: 5 / 7, partial: 0.4 });
    const missingEvidence = [...new Set([...(nhl.missingEvidence || []), ...completeness.missing])];
    const sourceFieldsUsed = [...new Set([...(nhl.sourceFieldsUsed || []), "pregameSnapshot.features.nhl", "teamContext.home"])] ;
    const featureSet = {
      ...base,
      matchId: record.matchId,
      league: record.league,
      sport: record.sport,
      homeTeamId: record.homeTeamId,
      awayTeamId: record.awayTeamId,
      homeTeamName: record.homeTeamName || base.homeTeamName,
      awayTeamName: record.awayTeamName || base.awayTeamName,
      nhl: { ...nhl, featureStatus: completeness.status, missingEvidence, sourceFieldsUsed },
      dataQuality: { ...base.dataQuality, completenessScore: completeness.completenessScore, missing: missingEvidence, provider: record.pregameSnapshot.provider },
    };
    return { matchId: record.matchId, league: "NHL", featureSet, featureStatus: completeness.status, missingEvidence, sourceFieldsUsed, extractorVersion: this.version, completenessScore: completeness.completenessScore };
  },
};
