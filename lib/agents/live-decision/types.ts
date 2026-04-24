import type { LeagueCode, MatchStatus } from "@/lib/pipeline/types";

export type LiveDecisionLabel = "STRONG" | "UPSET" | "CHAOS" | "WEAK" | "NONE";
export type LiveDecisionAction = "LEAN_HOME" | "LEAN_AWAY" | "UPSET_WATCH" | "AVOID" | "NO_ACTION";

export type LiveDecisionSignal = {
  label: string;
  score?: number | null;
};

export type LiveDecisionAgentInput = {
  league: LeagueCode;
  homeTeam: string;
  awayTeam: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  startsAt: string;
  marketHomeProb?: number | null;
  signals?: LiveDecisionSignal[] | null;
};

export type LiveDecisionAgentReport = {
  agent: "LiveDecisionAgent";
  label: LiveDecisionLabel;
  action: LiveDecisionAction;
  confidence: number;
  explanation: string;
  drivers: string[];
};
