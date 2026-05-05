import { PregameFeatureSet } from "../../types/features";
import { WorldEngineState } from "../../types/world";
import { deriveNBAWorldState } from "./engines/deriveNBAWorldState";
import { deriveMLBWorldState } from "./engines/deriveMLBWorldState";
import { deriveNHLWorldState } from "./engines/deriveNHLWorldState";
import { deriveNFLWorldState } from "./engines/deriveNFLWorldState";
import { deriveEPLWorldState } from "./engines/deriveEPLWorldState";
import { buildInsufficientDataWorldState } from "../engine/engineStatus";

export function deriveWorldState(features: PregameFeatureSet): WorldEngineState {
  switch (features.league.toUpperCase()) {
    case "NBA":
      return deriveNBAWorldState(features);
    case "MLB":
      return deriveMLBWorldState(features);
    case "NHL":
      return deriveNHLWorldState(features);
    case "NFL":
      return deriveNFLWorldState(features);
    case "EPL":
      return deriveEPLWorldState(features);
    default:
      return buildInsufficientDataWorldState(features, ["UNSUPPORTED_SPORT"]);
  }
}
