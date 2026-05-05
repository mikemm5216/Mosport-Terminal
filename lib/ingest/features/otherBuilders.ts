import { NormalizedProviderGame } from "../../providers/providerTypes";
import { NHLPregameFeatures, NFLPregameFeatures, EPLPregameFeatures } from "../../../types/features";

export function buildNHLFeatures(game: NormalizedProviderGame): NHLPregameFeatures {
  return {
    featureStatus: "MISSING",
    missingEvidence: ["goalieAdvantage", "specialTeams", "fatigue"],
    sourceFieldsUsed: [],
    goalieAdvantage: null,
    specialTeamsEdge: null,
    backToBackFatigue: null,
    shotQualityEdge: null,
    defensivePairingStability: null,
  };
}

export function buildNFLFeatures(game: NormalizedProviderGame): NFLPregameFeatures {
  return {
    featureStatus: "MISSING",
    missingEvidence: ["qbStability", "offensiveLine", "passRush"],
    sourceFieldsUsed: [],
    qbStability: null,
    offensiveLineHealth: null,
    passRushMismatch: null,
    redZoneEdge: null,
    gameScriptPressure: null,
    turnoverVolatility: null,
  };
}

export function buildEPLFeatures(game: NormalizedProviderGame): EPLPregameFeatures {
  return {
    featureStatus: "MISSING",
    missingEvidence: ["fixtureCongestion", "midfieldControl", "setPieceRisk"],
    sourceFieldsUsed: [],
    fixtureCongestion: null,
    midfieldControl: null,
    setPieceRisk: null,
    pressResistance: null,
    strikerForm: null,
    defensiveLineRisk: null,
  };
}
