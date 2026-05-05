import { MissingEvidenceReason } from "../../types/engine";
import { PregameFeatureSet } from "../../types/features";

export function checkEvidenceRequirements(features: PregameFeatureSet): MissingEvidenceReason[] {
  const missing: MissingEvidenceReason[] = [];

  if (features.sport === "BASEBALL") {
    if (features.mlb?.starterAdvantage == null) missing.push("MISSING_STARTING_PITCHER");
    if (features.mlb?.bullpenFreshness == null) missing.push("MISSING_BULLPEN_CONTEXT");
    if (features.mlb?.lineupQuality == null) missing.push("MISSING_LINEUP");
  }

  if (features.sport === "BASKETBALL") {
    if (features.nba?.starLoad == null) missing.push("MISSING_ROSTER");
    if (features.nba?.rotationRisk == null) missing.push("MISSING_LINEUP");
  }

  if (features.sport === "HOCKEY") {
    if (features.nhl?.goalieAdvantage == null) missing.push("MISSING_GOALIE_STATUS");
  }

  if (features.sport === "FOOTBALL") {
    if (features.nfl?.qbStability == null) missing.push("MISSING_QB_CONTEXT");
  }

  if (features.sport === "SOCCER") {
    if (features.epl?.fixtureCongestion == null) missing.push("MISSING_FIXTURE_CONTEXT");
  }

  if (features.teamContext.home.injuryBurden == null || features.teamContext.away.injuryBurden == null) {
    missing.push("MISSING_INJURY_CONTEXT");
  }

  if (features.teamContext.home.recentFormScore == null || features.teamContext.away.recentFormScore == null) {
    missing.push("MISSING_RECENT_FORM");
  }

  return missing;
}
