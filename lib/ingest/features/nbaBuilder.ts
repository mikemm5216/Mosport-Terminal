import { NormalizedProviderGame } from "../../providers/providerTypes";
import { NBAPregameFeatures } from "../../../types/features";

export function buildNBAFeatures(game: NormalizedProviderGame): NBAPregameFeatures {
  const missingEvidence: string[] = [];
  const sourceFieldsUsed: string[] = ["raw.competitions[0].competitors"];

  // NBA implementation is currently a skeleton
  missingEvidence.push("pacePressure", "rotationRisk", "benchStability", "starLoad", "foulTroubleRisk", "matchupMismatch");

  return {
    featureStatus: "PARTIAL",
    missingEvidence,
    sourceFieldsUsed,
    pacePressure: null,
    rotationRisk: null,
    benchStability: null,
    starLoad: null,
    foulTroubleRisk: null,
    matchupMismatch: null,
  };
}
