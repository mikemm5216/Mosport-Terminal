import { PregameFeatureSet } from "../../types/features";
import { WorldEngineState } from "../../types/world";
import { deriveWorldState } from "./deriveWorldState";

export function getEngineForMatch(features: PregameFeatureSet): WorldEngineState {
  return deriveWorldState(features);
}
