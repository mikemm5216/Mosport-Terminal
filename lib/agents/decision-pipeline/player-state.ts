export type PlayerState = "HOT" | "STABLE" | "FATIGUED" | "COLLAPSE_RISK";

export type PlayerCoachAction =
  | "FEATURE_MORE"
  | "KEEP_ON"
  | "REDUCE_MINUTES"
  | "BENCH";

export type EvaluatePlayerStateInput = {
  momentum: number;
  fatigue: number;
  pressure: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizedLoad(input: EvaluatePlayerStateInput): number {
  return input.fatigue * 0.45 + input.pressure * 0.4 - input.momentum * 0.15;
}

export function evaluatePlayerState(input: EvaluatePlayerStateInput): PlayerState {
  const normalized = {
    momentum: clamp(input.momentum, 0, 1),
    fatigue: clamp(input.fatigue, 0, 1),
    pressure: clamp(input.pressure, 0, 1),
  };
  const load = normalizedLoad(normalized);

  if (
    normalized.fatigue >= 0.78 ||
    normalized.pressure >= 0.8 ||
    (normalized.fatigue >= 0.68 && normalized.pressure >= 0.68) ||
    load >= 0.56
  ) {
    return "COLLAPSE_RISK";
  }

  if (
    normalized.momentum >= 0.68 &&
    normalized.fatigue <= 0.42 &&
    normalized.pressure <= 0.52 &&
    load <= 0.1
  ) {
    return "HOT";
  }

  if (
    normalized.fatigue >= 0.54 ||
    normalized.pressure >= 0.58 ||
    load >= 0.3
  ) {
    return "FATIGUED";
  }

  return "STABLE";
}

export function mapPlayerStateToCoachAction(state: PlayerState): PlayerCoachAction {
  if (state === "HOT") return "FEATURE_MORE";
  if (state === "FATIGUED") return "REDUCE_MINUTES";
  if (state === "COLLAPSE_RISK") return "BENCH";
  return "KEEP_ON";
}

export function buildPlayerStateReason(params: {
  playerName: string;
  state: PlayerState;
  momentum: number;
  fatigue: number;
  pressure: number;
}): string {
  const momentum = clamp(params.momentum, 0, 1);
  const fatigue = clamp(params.fatigue, 0, 1);
  const pressure = clamp(params.pressure, 0, 1);

  if (params.state === "HOT") {
    return `${params.playerName} has live rhythm, fresh legs, and is handling pressure cleanly, so the staff should lean into this stretch.`;
  }

  if (params.state === "FATIGUED") {
    return `${params.playerName} is starting to lose burst under game pressure, and the rotation should trim minutes before execution drops further.`;
  }

  if (params.state === "COLLAPSE_RISK") {
    return `${params.playerName} is carrying dead legs and heavy pressure, and the current shift is close to breaking the lineup's rhythm.`;
  }

  const pressureRead =
    pressure >= 0.55 ? "the game is testing the player" : "the pressure is manageable";
  const fatigueRead =
    fatigue >= 0.5 ? "legs are steady enough" : "legs are still live";

  return `${params.playerName} is holding a playable rhythm, ${fatigueRead}, and ${pressureRead}, so the coach can stay with the current run.`;
}
