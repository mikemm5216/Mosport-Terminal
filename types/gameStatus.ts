export type AnalysisPhase =
  | "PREGAME_OPEN"
  | "PREGAME_LOCKED"
  | "LIVE_FOLLOW_ONLY"
  | "POSTGAME_VERDICT";

export type LiveStatus = {
  status: "scheduled" | "pregame" | "live" | "final" | "postponed" | "cancelled";
  display: string;
  period?: string;
  clock?: string;
  inning?: string;
  inningHalf?: "top" | "bottom";
  matchMinute?: number;
  stoppageTime?: number;
  lastUpdated?: string;
};
