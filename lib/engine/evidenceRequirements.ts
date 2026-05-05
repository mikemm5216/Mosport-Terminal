import { MissingEvidenceReason } from "../../types/engine";
import { PregameFeatureSet } from "../../types/features";

export function checkEvidenceRequirements(features: PregameFeatureSet): MissingEvidenceReason[] {
  const missing: MissingEvidenceReason[] = [];

  if (features.sport === "BASEBALL") {
    if (!features.mlb?.starterAdvantage) missing.push("MISSING_STARTING_PITCHER");
    if (!features.mlb?.bullpenFreshness) missing.push("MISSING_BULLPEN_CONTEXT");
    if (!features.mlb?.lineupQuality) missing.push("MISSING_LINEUP");
  }

  if (features.sport === "BASKETBALL") {
    if (!features.nba?.starLoad) missing.push("MISSING_ROSTER");
    if (!features.nba?.rotationRisk) missing.push("MISSING_LINEUP");
  }

  if (features.sport === "HOCKEY") {
    if (!features.nhl?.goalieAdvantage) missing.push("MISSING_GOALIE_STATUS");
  }

  if (features.sport === "FOOTBALL") {
    if (!features.nfl?.qbStability) missing.push("MISSING_QB_CONTEXT");
  }

  if (features.sport === "SOCCER") {
    if (!features.epl?.fixtureCongestion) missing.push("MISSING_FIXTURE_CONTEXT");
  }

  if (features.teamContext.home.injuryBurden === undefined || features.teamContext.away.injuryBurden === undefined) {
    missing.push("MISSING_INJURY_CONTEXT");
  }

  if (features.teamContext.home.recentFormScore === undefined || features.teamContext.away.recentFormScore === undefined) {
    missing.push("MISSING_RECENT_FORM");
  }

  return missing;
}
