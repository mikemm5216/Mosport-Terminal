import { WorldEngineState } from "../../types/world";
import { CoachReadDTO } from "../../types/coach";
import { translateNBAWorldStateToCoachRead } from "./translators/translateNBAWorldStateToCoachRead";
import { translateMLBWorldStateToCoachRead } from "./translators/translateMLBWorldStateToCoachRead";
import { translateNHLWorldStateToCoachRead } from "./translators/translateNHLWorldStateToCoachRead";
import { translateNFLWorldStateToCoachRead } from "./translators/translateNFLWorldStateToCoachRead";
import { translateEPLWorldStateToCoachRead } from "./translators/translateEPLWorldStateToCoachRead";

export function getCoachRead(worldState: WorldEngineState): CoachReadDTO {
  switch (worldState.league.toUpperCase()) {
    case "NBA":
      return translateNBAWorldStateToCoachRead(worldState);
    case "MLB":
      return translateMLBWorldStateToCoachRead(worldState);
    case "NHL":
      return translateNHLWorldStateToCoachRead(worldState);
    case "NFL":
      return translateNFLWorldStateToCoachRead(worldState);
    case "EPL":
      return translateEPLWorldStateToCoachRead(worldState);
    default:
      throw new Error(`Unsupported league for Coach Read: ${worldState.league}`);
  }
}
